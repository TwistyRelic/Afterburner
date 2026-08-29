import { useEffect, useRef, useState } from "react";
import { useRun } from "./RunContext.jsx";
import useVoiceTimer, { MIN_SPEECH_MS } from "./useVoiceTimer.js";
import { PHRASE } from "./talktest.js";

// The one control that matters: read the sentence out loud, and the phone times
// the speech. If the microphone is not available, the runner holds the button
// while speaking and releases at the breath — the same interval, timed by hand.
function say(reading, spoken) {
  if (!spoken || typeof speechSynthesis === "undefined") return;
  speechSynthesis.cancel();
  speechSynthesis.speak(new SpeechSynthesisUtterance(`Zone ${reading.zone}`));
}

export default function Capture({ onReading }) {
  const { addReading, settings } = useRun();
  const { state, seconds, level, error, start, cancel, reset } =
    useVoiceTimer();
  const [held, setHeld] = useState(null);
  const heldRef = useRef(0);
  const takenRef = useRef(null);

  useEffect(() => {
    if (state !== "done" || seconds === null) return;
    if (takenRef.current === seconds) return;
    takenRef.current = seconds;
    const reading = addReading(seconds);
    if (!reading) return;
    say(reading, settings.spoken);
    onReading?.(reading);
  }, [addReading, onReading, seconds, settings.spoken, state]);

  const manual = state === "unsupported";

  const holdStart = () => {
    heldRef.current = performance.now();
    setHeld(0);
  };

  const holdEnd = () => {
    if (!heldRef.current) return;
    const elapsed = performance.now() - heldRef.current;
    heldRef.current = 0;
    setHeld(null);
    if (elapsed < MIN_SPEECH_MS) return;
    const reading = addReading(elapsed / 1000);
    if (!reading) return;
    say(reading, settings.spoken);
    onReading?.(reading);
  };

  useEffect(() => {
    if (held === null) return undefined;
    const id = setInterval(() => {
      if (heldRef.current)
        setHeld((performance.now() - heldRef.current) / 1000);
    }, 100);
    return () => clearInterval(id);
  }, [held]);

  return (
    <section className="capture">
      <p className="phrase">{PHRASE}</p>
      {manual ? (
        <button
          className="talk talk-hold"
          onPointerDown={holdStart}
          onPointerUp={holdEnd}
          onPointerCancel={holdEnd}
          type="button"
        >
          {held === null ? "Hold and read" : `${held.toFixed(1)} s`}
        </button>
      ) : (
        <button
          className={state === "listening" ? "talk talk-live" : "talk"}
          onClick={state === "listening" ? cancel : start}
          style={
            state === "listening"
              ? { boxShadow: `0 0 0 ${6 + level * 22}px rgba(90,225,140,.14)` }
              : undefined
          }
          type="button"
        >
          {state === "listening"
            ? "Listening"
            : state === "done"
              ? "Read it again"
              : "Read it out loud"}
        </button>
      )}
      <p className="capture-note">
        {manual
          ? `No microphone here${error ? ` (${error})` : ""} — hold the button while you speak and let go at the breath.`
          : state === "listening"
            ? "Speaking… the clock stops at your breath."
            : "One tap, then read the sentence in one breath."}
      </p>
      {state === "done" ? (
        <button className="quiet" onClick={reset} type="button">
          Clear
        </button>
      ) : null}
    </section>
  );
}
