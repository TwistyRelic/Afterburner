import { useCallback, useEffect, useState } from "react";
import Record from "../Record.jsx";
import Ribbon from "../Ribbon.jsx";
import { detectDecoupling } from "../decoupling.js";
import { run } from "../run.js";
import { useCadence } from "../useCadence.js";
import { useMovement } from "../useMovement.js";

const flags = detectDecoupling(run.splits);
const collapse = flags.find((flag) => flag.kind === "form-collapse");
const flag = collapse ?? flags[0] ?? null;

// The verdict is the one sentence worth saying out loud, built from the same
// numbers the coach reads. It is the only text left standing in judge mode.
const verdict = flag
  ? `Km ${flag.km} · +${flag.paceSlip} s/km · −${flag.cadenceDrop} spm`
  : `${run.distance} · even cadence`;
const verdictSaid = flag ? `Said “${run.said}”` : "Nothing came apart";

export default function Screen({ onLog }) {
  const { spm, live, request } = useCadence();
  const { locked, watching, countdown } = useMovement();
  const [accepted, setAccepted] = useState(0);
  const [blocked, setBlocked] = useState(0);
  const [recordSpace, setRecordSpace] = useState(168);
  const [judge, setJudge] = useState(false);
  const onHeight = useCallback((height) => setRecordSpace(height), []);

  useEffect(() => {
    if (!judge) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setJudge(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [judge]);

  const log = (text) => {
    onLog(text);
    setAccepted((count) => count + 1);
  };

  return (
    <div
      className={[
        "screen",
        locked ? "screen-locked" : "",
        judge ? "screen-judge" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ "--record-space": `${recordSpace}px` }}
    >
      <div className="plate screen-top">
        <span className="plate-label">Afterburner · live</span>
        <span className="plate-value">
          {run.distance} · {run.markers} markers spoken
          {live ? ` · ${spm} spm` : ""}
        </span>
        <button
          className="judge-enter"
          type="button"
          onClick={() => setJudge(true)}
        >
          Judge mode
        </button>
      </div>

      <div className="screen-stage">
        <Ribbon locked={locked} judge={judge} judgeKm={flag?.km} />
      </div>

      {judge ? (
        <>
          <p className="verdict">
            {verdict}
            <span className="verdict-said">{verdictSaid}</span>
          </p>
          <button
            className="judge-exit"
            type="button"
            onClick={() => setJudge(false)}
          >
            Exit
          </button>
        </>
      ) : null}

      {locked ? (
        <p className="plate bar-locked" role="status">
          <strong>Build locked</strong> — stationary for 15 s. Move to unlock.
          <span className="bar-counts">
            {accepted} accepted · {blocked} blocked
          </span>
        </p>
      ) : (
        <p className="plate bar-moving" role="status">
          <strong>Moving</strong>
          {watching
            ? ` — locks after ${countdown} s still.`
            : " — no position fix, gate off."}
          <span className="bar-counts">
            {accepted} accepted · {blocked} blocked
          </span>
        </p>
      )}

      {flag ? (
        <p
          className={
            flag.kind === "form-collapse"
              ? "plate evidence evidence-collapse"
              : "plate evidence"
          }
        >
          <span className="evidence-words">
            <strong>Km {flag.km}</strong> — said {run.said}, ran {flag.paceSlip}
            {" s/km slower"}
            {flag.kind === "form-collapse" ? (
              <>
                {" with cadence −"}
                {flag.cadenceDrop} spm. <strong>Form collapse.</strong>
              </>
            ) : (
              "."
            )}
          </span>
          <span className="evidence-numbers">
            <strong>Km {flag.km}</strong> · +{flag.paceSlip} s/km
            {flag.kind === "form-collapse" ? (
              <>
                {" · −"}
                {flag.cadenceDrop} spm · <strong>collapse</strong>
              </>
            ) : (
              ""
            )}
          </span>
        </p>
      ) : (
        <p className="plate evidence">
          <span className="evidence-words">
            {run.distance} at an even cadence — nothing came apart.
          </span>
          <span className="evidence-numbers">
            {run.distance} · even cadence
          </span>
        </p>
      )}

      <Record
        onLog={log}
        onArm={request}
        onHeight={onHeight}
        locked={locked}
        judge={judge}
        onBlocked={() => setBlocked((count) => count + 1)}
      />
    </div>
  );
}
