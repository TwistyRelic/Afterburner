import { useRun } from "../RunContext.jsx";
import { formatPace } from "../pacing.js";
import { bandFor } from "../talktest.js";

function when(iso) {
  const at = new Date(iso);
  return `${at.toLocaleDateString([], { day: "numeric", month: "short" })} · ${at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export default function Sessions() {
  const { readings, forget } = useRun();

  return (
    <div className="page">
      <h1 className="title">Sessions</h1>
      <p className="lede">
        {readings.length
          ? `${readings.length} reading${readings.length === 1 ? "" : "s"} stored on this phone.`
          : "No readings yet. Read the sentence on the run view and it lands here."}
      </p>

      <ul className="log">
        {readings.map((reading) => (
          <li className={`row row-z${reading.zone}`} key={reading.id}>
            <span className="row-zone">{reading.zone}</span>
            <span className="row-main">
              <span className="row-when">{when(reading.at)}</span>
              <span className="row-band">{bandFor(reading.zone)?.label}</span>
            </span>
            <span className="row-numbers">
              <span>{reading.seconds.toFixed(1)} s spoken</span>
              <span>{formatPace(reading.pace) ?? "no pace fix"}</span>
            </span>
          </li>
        ))}
      </ul>

      {readings.length ? (
        <button className="quiet" onClick={forget} type="button">
          Forget every reading
        </button>
      ) : null}
    </div>
  );
}
