import GhostTrack from "../GhostTrack.jsx";
import { useRun } from "../RunContext.jsx";
import { formatPace, ghostPace, secondsBehind } from "../pacing.js";
import { BANDS } from "../talktest.js";

export default function Phase() {
  const { latest, pace, km, settings, update } = useRun();
  const runnerPace = pace ?? latest?.pace ?? null;
  const ghost = latest
    ? ghostPace(runnerPace, latest.zone, settings.targetZone)
    : null;
  const gap = ghost && km > 0.01 ? secondsBehind(runnerPace, ghost, km) : null;

  return (
    <div className="page">
      <h1 className="title">The adaptive ghost</h1>
      <p className="lede">
        The ghost holds the pace your last reading says lands you in your target
        zone. Read again and it repaces itself.
      </p>

      <GhostTrack runnerPace={runnerPace} ghost={ghost} />

      <div className="cards">
        <p className="card">
          <span className="card-label">Ghost pace</span>
          <span className="card-value">{formatPace(ghost) ?? "—"}</span>
        </p>
        <p className="card">
          <span className="card-label">
            {gap === null ? "Gap" : gap >= 0 ? "Behind the ghost" : "Ahead"}
          </span>
          <span className="card-value">
            {gap === null ? "—" : `${Math.abs(gap)} s`}
          </span>
        </p>
      </div>

      {latest ? (
        <p className="evidence">
          From {latest.seconds.toFixed(1)} s of speech in zone {latest.zone}
          {runnerPace ? ` at ${formatPace(runnerPace)}` : ""}, repaced to zone{" "}
          {settings.targetZone}.
        </p>
      ) : (
        <p className="evidence">
          No reading yet, so there is no ghost pace to show.
        </p>
      )}

      <fieldset className="chooser">
        <legend>Target zone</legend>
        {BANDS.map((band) => (
          <button
            className={
              settings.targetZone === band.zone ? "chip chip-on" : "chip"
            }
            key={band.zone}
            onClick={() => update({ targetZone: band.zone })}
            type="button"
          >
            {band.zone}
          </button>
        ))}
      </fieldset>

      <p className="fine">
        Every pace here is derived from a timed reading and a pace the phone
        measured. Nothing is predicted and nothing is diagnosed.
      </p>
    </div>
  );
}
