import { useCallback, useState } from "react";
import Record from "../Record.jsx";
import Ribbon from "../Ribbon.jsx";
import { detectDecoupling } from "../decoupling.js";
import { run } from "../run.js";
import { useCadence } from "../useCadence.js";
import { useMovement } from "../useMovement.js";

const flags = detectDecoupling(run.splits);
const collapse = flags.find((flag) => flag.kind === "form-collapse");
const flag = collapse ?? flags[0] ?? null;

export default function Screen({ onLog }) {
  const { spm, live, request } = useCadence();
  const { locked, watching, countdown } = useMovement();
  const [accepted, setAccepted] = useState(0);
  const [blocked, setBlocked] = useState(0);
  const [recordSpace, setRecordSpace] = useState(168);
  const onHeight = useCallback((height) => setRecordSpace(height), []);

  const log = (text) => {
    onLog(text);
    setAccepted((count) => count + 1);
  };

  return (
    <div
      className={locked ? "screen screen-locked" : "screen"}
      style={{ "--record-space": `${recordSpace}px` }}
    >
      <div className="plate screen-top">
        <span className="plate-label">Afterburner · live</span>
        <span className="plate-value">
          {run.distance} · {run.markers} markers spoken
          {live ? ` · ${spm} spm` : ""}
        </span>
      </div>

      <div className="screen-stage">
        <Ribbon locked={locked} />
      </div>

      {locked ? (
        <p className="plate bar-locked" role="status">
          <strong>Build locked.</strong> Stationary for 15 s, so move to unlock.
          <span className="bar-counts">
            {accepted} accepted · {blocked} blocked
          </span>
        </p>
      ) : (
        <p className="plate bar-moving" role="status">
          <strong>Moving.</strong>
          {watching
            ? ` Locks after ${countdown} s still.`
            : " No position fix, so the gate is off."}
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
          <strong>Km {flag.km}:</strong> said {run.said}, ran {flag.paceSlip}
          {" s/km slower"}
          {flag.kind === "form-collapse" ? (
            <>
              {" with cadence down "}
              {flag.cadenceDrop} spm. <strong>Form collapse.</strong>
            </>
          ) : (
            "."
          )}
        </p>
      ) : (
        <p className="plate evidence">
          {run.distance} at an even cadence, and nothing came apart.
        </p>
      )}

      <Record
        onLog={log}
        onArm={request}
        onHeight={onHeight}
        locked={locked}
        onBlocked={() => setBlocked((count) => count + 1)}
      />
    </div>
  );
}
