import { useCallback, useEffect, useRef, useState } from "react";

// Times one spoken run: it starts the clock on the first voiced frame and stops
// it when the voice drops out long enough to be a breath. The number it reports
// is measured from the microphone, never estimated.
export const BREATH_MS = 320;
export const MIN_SPEECH_MS = 700;
const VOICED_RMS = 0.045;

export default function useVoiceTimer() {
  const [state, setState] = useState("idle");
  const [seconds, setSeconds] = useState(null);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState(null);
  const contextRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(0);
  const spanRef = useRef({ start: 0, lastVoiced: 0 });

  const release = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    contextRef.current?.close();
    contextRef.current = null;
    setLevel(0);
  }, []);

  useEffect(() => release, [release]);

  const start = useCallback(async () => {
    setError(null);
    setSeconds(null);
    if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) {
      setState("unsupported");
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (cause) {
      setError(cause?.name ?? "denied");
      setState("unsupported");
      return;
    }
    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    context.createMediaStreamSource(stream).connect(analyser);
    streamRef.current = stream;
    contextRef.current = context;
    spanRef.current = { start: 0, lastVoiced: 0 };
    setState("listening");

    const frame = new Float32Array(analyser.fftSize);
    const tick = () => {
      analyser.getFloatTimeDomainData(frame);
      let sum = 0;
      for (const sample of frame) sum += sample * sample;
      const rms = Math.sqrt(sum / frame.length);
      setLevel(Math.min(rms / (VOICED_RMS * 4), 1));
      const now = performance.now();
      const span = spanRef.current;
      if (rms >= VOICED_RMS) {
        if (!span.start) span.start = now;
        span.lastVoiced = now;
      } else if (
        span.start &&
        now - span.lastVoiced >= BREATH_MS &&
        span.lastVoiced - span.start >= MIN_SPEECH_MS
      ) {
        setSeconds((span.lastVoiced - span.start) / 1000);
        setState("done");
        release();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [release]);

  const cancel = useCallback(() => {
    release();
    setState("idle");
  }, [release]);

  const reset = useCallback(() => {
    setSeconds(null);
    setState("idle");
  }, []);

  return { state, seconds, level, error, start, cancel, reset };
}
