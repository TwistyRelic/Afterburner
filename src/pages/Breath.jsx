import { useState } from "react";
import { useBreath } from "../useBreath.js";
import { TEST_SENTENCE, ZONES, guidanceFor } from "../breath.js";

const INTENTS = [
  { id: "easy", label: "Easy run" },
  { id: "threshold", label: "Threshold" },
  { id: "intervals", label: "Intervals" },
];

export default function Breath() {
  const breath = useBreath();
  const [intent, setIntent] = useState("easy");
  const { state, result } = breath;
  const zone = result?.zone ?? null;
  const progress = Math.min(1, breath.elapsed / breath.sampleSeconds);

  return (
    <div className="breath">
      <header className="breath-head">
        <h1>How hard are you actually working?</h1>
        <p className="breath-sub">
          Read one sentence out loud. Afterburner listens to where you breathe, not to
          what you say, and tells you which zone you are really in.
        </p>
      </header>

      <div className="intent-row" role="group" aria-label="What is today meant to be?">
        {INTENTS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={intent === option.id ? "intent on" : "intent"}
            onClick={() => setIntent(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {state !== "done" && (
        <>
          <p className="test-sentence">“{TEST_SENTENCE}”</p>

          <div className="level-wrap" aria-hidden="true">
            <div className="level-bar" style={{ transform: `scaleX(${Math.min(1, breath.level * 14)})` }} />
          </div>

          <button
            className={state === "listening" ? "mic listening" : "mic"}
            type="button"
            onClick={state === "listening" ? breath.stop : breath.start}
          >
            <span className="mic-inner">
              {state === "listening"
                ? `${Math.max(0, Math.ceil(breath.sampleSeconds - breath.elapsed))}`
                : "Read it"}
            </span>
          </button>

          {state === "listening" && (
            <div className="sample-progress" aria-hidden="true">
              <span style={{ transform: `scaleX(${progress})` }} />
            </div>
          )}

          <p className="mic-hint">
            {state === "listening"
              ? "Keep reading. Breathe whenever you need to, that is the measurement."
              : "Twelve seconds. Breathe normally, do not try to hold it."}
          </p>
          {breath.error && <p className="heard error">{breath.error}</p>}
        </>
      )}

      {state === "done" && result && (
        <div className="result">
          <div className="zone-card" style={{ "--zone": zone?.colour ?? "#9BA6B5" }}>
            <span className="zone-index">Zone {zone?.id ?? "?"} of 5</span>
            <span className="zone-name">{zone?.name ?? "Not enough speech"}</span>
            <span className="zone-lead">{zone?.lead ?? "Read the sentence out loud and try again."}</span>
          </div>

          <div className="zone-ladder" aria-hidden="true">
            {ZONES.map((z) => (
              <span
                key={z.id}
                className={zone && z.id === zone.id ? "rung on" : "rung"}
                style={{ background: z.colour }}
              />
            ))}
          </div>

          <p className="guidance">{guidanceFor(zone, intent)}</p>

          <div className="metrics">
            <div>
              <span className="metric-value">{result.phraseLength ?? "-"}s</span>
              <span className="metric-label">between breaths</span>
            </div>
            <div>
              <span className="metric-value">{result.phraseRate ?? "-"}</span>
              <span className="metric-label">breaths per minute</span>
            </div>
            <div>
              <span className="metric-value">
                {result.pauseRatio != null ? `${Math.round(result.pauseRatio * 100)}%` : "-"}
              </span>
              <span className="metric-label">of it silent</span>
            </div>
            <div>
              <span className="metric-value">{result.longest ?? "-"}s</span>
              <span className="metric-label">longest run of speech</span>
            </div>
          </div>

          {breath.history.length > 1 && (
            <div className="history">
              <span className="plate-label">Your samples</span>
              <div className="history-row">
                {breath.history.slice().reverse().map((h, i) => (
                  <span
                    key={h.at}
                    className="history-dot"
                    style={{ background: h.zone?.colour ?? "#232A34" }}
                    title={`Sample ${i + 1}: zone ${h.zone?.id ?? "?"}`}
                  />
                ))}
              </div>
              <span className="plate-note">
                Left to right, oldest first. Take one at the start of a run and one at the end.
              </span>
            </div>
          )}

          <button type="button" className="ghost wide" onClick={breath.reset}>
            Take another
          </button>
        </div>
      )}

      <p className="honest-note">
        This is the talk test, a long standing method coaches use by ear. It measures how
        much you can say between breaths. It is not a lactate test, it is not VO2 max, and
        it does not diagnose anything. Nothing is recorded and no audio leaves this phone.
      </p>
    </div>
  );
}
