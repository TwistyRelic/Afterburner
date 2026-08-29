import gsap from "gsap";
import { useEffect, useRef } from "react";
import { formatPace } from "./pacing.js";

// Two lanes: the pace the phone measured and the pace the ghost is holding after
// the last reading. The markers only move when there are two real paces to
// compare, so nothing here animates off an invented number.
export default function GhostTrack({ runnerPace, ghost }) {
  const runnerRef = useRef(null);
  const ghostRef = useRef(null);

  useEffect(() => {
    if (!runnerPace || !ghost) return;
    const faster = Math.min(runnerPace, ghost);
    const scale = (pace) => `${(faster / pace) * 100}%`;
    gsap.to(runnerRef.current, {
      width: scale(runnerPace),
      duration: 0.8,
      ease: "power2.out",
    });
    gsap.to(ghostRef.current, {
      width: scale(ghost),
      duration: 0.8,
      ease: "power2.out",
    });
  }, [ghost, runnerPace]);

  return (
    <div className="track">
      <div className="lane">
        <span className="lane-label">You</span>
        <span className="lane-bar">
          <span className="lane-fill lane-you" ref={runnerRef} />
        </span>
        <span className="lane-value">{formatPace(runnerPace) ?? "—"}</span>
      </div>
      <div className="lane">
        <span className="lane-label">Ghost</span>
        <span className="lane-bar">
          <span className="lane-fill lane-ghost" ref={ghostRef} />
        </span>
        <span className="lane-value">{formatPace(ghost) ?? "—"}</span>
      </div>
    </div>
  );
}
