import Record from "../Record.jsx";
import Ribbon from "../Ribbon.jsx";
import { detectDecoupling } from "../decoupling.js";
import { run } from "../run.js";
import { useCadence } from "../useCadence.js";

const flags = detectDecoupling(run.splits);
const collapse = flags.find((flag) => flag.kind === "form-collapse");
const flag = collapse ?? flags[0] ?? null;

export default function Screen({ onLog }) {
  const { spm, live, request } = useCadence();

  return (
    <div className="screen">
      <div className="plate screen-top">
        <span className="plate-label">Afterburner · live</span>
        <span className="plate-value">
          {run.distance} · {run.markers} markers spoken
          {live ? ` · ${spm} spm` : ""}
        </span>
      </div>

      <div className="screen-stage">
        <Ribbon />
      </div>

      {flag ? (
        <p
          className={
            flag.kind === "form-collapse"
              ? "plate evidence evidence-collapse"
              : "plate evidence"
          }
        >
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
        </p>
      ) : (
        <p className="plate evidence">
          {run.distance} at an even cadence — nothing came apart.
        </p>
      )}

      <Record onLog={onLog} onArm={request} />
    </div>
  );
}
