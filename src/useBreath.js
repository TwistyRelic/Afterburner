import { useCallback, useEffect, useRef, useState } from "react";
import { analyse, zoneFor } from "./breath.js";

const SAMPLE_SECONDS = 12;

// Listens to the microphone and turns raw loudness into breathing structure.
// Nothing is uploaded, nothing is recorded to a file, and no audio ever leaves
// the phone: we read the energy of each frame and throw the audio away.
export function useBreath() {
  const [state, setState] = useState("idle"); // idle | listening | done | error
  const [level, setLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");

  const framesRef = useRef([]);
  const rafRef = useRef(0);
  const streamRef = useRef(null);
  const ctxRef = useRef(null);

  const teardown = useCallback(() => {
    window.cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (ctxRef.current && ctxRef.current.state !== "closed") {
      ctxRef.current.close().catch(() => {});
      ctxRef.current = null;
    }
  }, []);

  useEffect(() => () => teardown(), [teardown]);

  const start = useCallback(async () => {
    setError("");
    setResult(null);
    framesRef.current = [];
    setElapsed(0);

    if (!navigator.mediaDevices || !window.AudioContext) {
      setError("This browser will not give us the microphone.");
      setState("error");
      return;
    }

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch {
      setError("The microphone is off, so there is nothing to measure.");
      setState("error");
      return;
    }

    streamRef.current = stream;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    ctxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);

    const buffer = new Float32Array(analyser.fftSize);
    const t0 = performance.now();
    setState("listening");

    const tick = () => {
      analyser.getFloatTimeDomainData(buffer);
      let sum = 0;
      for (let i = 0; i < buffer.length; i += 1) sum += buffer[i] * buffer[i];
      const rms = Math.sqrt(sum / buffer.length);
      const t = (performance.now() - t0) / 1000;

      framesRef.current.push({ t, rms });
      setLevel(rms);
      setElapsed(t);

      if (t >= SAMPLE_SECONDS) {
        teardown();
        const measured = analyse(framesRef.current);
        const zone = measured ? zoneFor(measured) : null;
        const record = { ...measured, zone, at: new Date().toISOString() };
        setResult(record);
        setHistory((h) => [record, ...h].slice(0, 8));
        setState("done");
        return;
      }
      rafRef.current = window.requestAnimationFrame(tick);
    };
    rafRef.current = window.requestAnimationFrame(tick);
  }, [teardown]);

  const stop = useCallback(() => {
    teardown();
    const measured = analyse(framesRef.current);
    if (measured && measured.phraseLength != null) {
      const zone = zoneFor(measured);
      const record = { ...measured, zone, at: new Date().toISOString() };
      setResult(record);
      setHistory((h) => [record, ...h].slice(0, 8));
      setState("done");
    } else {
      setState("idle");
    }
  }, [teardown]);

  const reset = useCallback(() => {
    setResult(null);
    setState("idle");
    setElapsed(0);
  }, []);

  return {
    state, level, elapsed, result, history, error,
    start, stop, reset,
    sampleSeconds: SAMPLE_SECONDS,
  };
}
