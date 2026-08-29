import Ribbon from "../Ribbon.jsx";
import { run } from "../run.js";

export default function Screen() {
  return (
    <div className="screen">
      <div className="plate screen-top">
        <span className="plate-label">Afterburner · live</span>
        <span className="plate-value">
          {run.distance} · {run.markers} markers spoken
        </span>
      </div>

      <div className="screen-stage">
        <Ribbon />
      </div>

      <p className="plate evidence">
        Said <strong>{run.said}</strong> at km {run.focusKm} — ran {run.slower}
        /km slower, cadence −{run.cadenceDrop}.
      </p>

      <button className="mic" type="button">
        <span className="mic-inner">Speak</span>
      </button>
    </div>
  );
}
