import { useEffect, useRef, useState } from "react";

// Voice is the primary input. The browser's own recogniser does the listening;
// when it is missing or refuses, the small typed fallback takes over.
const getRecognition = () =>
  window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;

export default function Record({
  onLog,
  onArm,
  onHeight,
  locked = false,
  judge = false,
  onBlocked,
}) {
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState("");
  const recognitionRef = useRef(null);
  const rootRef = useRef(null);

  // The control is fixed, so the page cannot see how tall it grew when the
  // transcript and the typed input appear. Report the measured height so the
  // screen can reserve exactly that much and nothing gets covered.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !onHeight) return undefined;
    const observer = new ResizeObserver(() => onHeight(root.offsetHeight));
    observer.observe(root);
    onHeight(root.offsetHeight);
    return () => observer.disconnect();
  }, [onHeight]);

  const stop = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  };

  const start = () => {
    if (locked) {
      onBlocked?.();
      return;
    }
    onArm?.();
    const Recognition = getRecognition();
    if (!Recognition) {
      setTyping(true);
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "en-GB";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(" ")
        .trim();
      setHeard(transcript);
      if (event.results[event.results.length - 1].isFinal && transcript) {
        onLog(transcript);
      }
    };
    recognition.onerror = () => {
      setListening(false);
      setTyping(true);
    };
    recognition.onend = () => setListening(false);

    recognition.start();
    recognitionRef.current = recognition;
    setHeard("");
    setListening(true);
  };

  const submitTyped = (event) => {
    event.preventDefault();
    const note = text.trim();
    if (!note) return;
    if (locked) {
      onBlocked?.();
      setText("");
      return;
    }
    onLog(note);
    setHeard(note);
    setText("");
  };

  return (
    <div className={judge ? "record record-judge" : "record"} ref={rootRef}>
      {(listening || heard) && (
        <p className="plate record-heard">
          <span className="plate-label">
            {listening ? "Listening" : "Heard"}
          </span>
          <span className="plate-value">{heard || "Say the kilometre"}</span>
        </p>
      )}

      <button
        className={[
          "mic",
          judge ? "mic-judge" : "",
          locked ? "mic-locked" : "",
          listening ? "mic-live" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        type="button"
        aria-label={
          locked
            ? "Blocked while stationary"
            : listening
              ? "Stop recording"
              : "Record"
        }
        aria-pressed={listening}
        onClick={listening ? stop : start}
      >
        {judge ? (
          <span className="mic-word">{listening ? "Listening" : "Talk"}</span>
        ) : (
          <span className="mic-dot" />
        )}
      </button>

      {judge && !typing ? null : typing ? (
        <form className="record-typed" onSubmit={submitTyped}>
          <label className="sr-only" htmlFor="record-typed-input">
            Type the note instead
          </label>
          <input
            id="record-typed-input"
            placeholder="Type it instead"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <button className="record-send" type="submit">
            Log
          </button>
        </form>
      ) : (
        <button
          className="record-fallback"
          type="button"
          onClick={() => setTyping(true)}
        >
          Type it instead
        </button>
      )}
    </div>
  );
}
