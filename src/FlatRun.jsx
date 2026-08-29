import {
  cumulativeSeconds,
  ghostPace,
  secondsBehind,
  totalSeconds,
} from "./ghost.js";
import { run } from "./run.js";

// The run with no WebGL: same splits, same heights, drawn as bars. It exists so
// a phone whose 3D context will not start can still be handed to somebody.
const marks = cumulativeSeconds(run.splits);
const pace = ghostPace(run.splits);
const gap = Math.round(secondsBehind(totalSeconds(marks), marks, pace));
const fastest = Math.min(...run.splits.map((split) => split.pace));
const slowest = Math.max(...run.splits.map((split) => split.pace));

const effort = (value) => `hsl(${140 - value * 14} 78% 52%)`;

export default function FlatRun({ locked = false, flagsByKm }) {
  return (
    <div className={locked ? "flat-run flat-run-locked" : "flat-run"}>
      <p className="plate ghost-gap">
        <span className="plate-label">Behind the ghost of km 1</span>
        <span className="ghost-gap-value">{gap} s</span>
      </p>
      <ul className="flat-bars">
        {run.splits.map((split) => (
          <li className="flat-bar" key={split.km}>
            <span
              className={
                flagsByKm?.has(split.km)
                  ? "flat-fill flat-fill-flag"
                  : "flat-fill"
              }
              style={{
                height: `${((split.pace - fastest) / (slowest - fastest)) * 82 + 18}%`,
                background: effort(split.effort),
              }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
