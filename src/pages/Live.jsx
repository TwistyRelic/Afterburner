import { Link } from "react-router-dom";
import Capture from "../Capture.jsx";
import GhostTrack from "../GhostTrack.jsx";
import ZoneDial from "../ZoneDial.jsx";
import { useRun } from "../RunContext.jsx";
import { formatPace, ghostPace } from "../pacing.js";

export default function Live() {
  const { latest, pace, km, paceSupported, settings } = useRun();
  const ghost = latest
    ? ghostPace(pace ?? latest.pace, latest.zone, settings.targetZone)
    : null;

  return (
    <div className="page live">
      <header className="live-top">
        <p className="plate">
          <span className="plate-label">Distance</span>
          <span className="plate-value">
            {km > 0.01 ? `${km.toFixed(2)} km` : "—"}
          </span>
        </p>
        <p className="plate">
          <span className="plate-label">Measured pace</span>
          <span className="plate-value">{formatPace(pace) ?? "—"}</span>
        </p>
      </header>

      <ZoneDial zone={latest?.zone ?? null} seconds={latest?.seconds ?? null} />

      <GhostTrack runnerPace={pace ?? latest?.pace ?? null} ghost={ghost} />

      <p className="target">
        Ghost is pacing you towards zone {settings.targetZone}.{" "}
        <Link to="/settings">Change</Link>
      </p>

      <Capture />

      {paceSupported ? null : (
        <p className="fine">
          No location fix, so there is no measured pace. The zone still comes
          from the timed speech.
        </p>
      )}
    </div>
  );
}
