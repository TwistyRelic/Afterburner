import { useEffect, useRef, useState } from "react";
import GhostView from "./GhostView.jsx";
import { ZONES } from "./breath.js";

// A LIVE demo, not a video. The gap runs on a slow loop so a visitor sees the
// ghost pull ahead, get caught, and pull ahead again, with the zone changing
// underneath it. Everything on screen is the same component the app uses.
//
// The numbers here are a scripted walkthrough and the caption says so. It is a
// demonstration of the mechanic, not a recording of a real runner.

const BEATS = [
  { gap: -4, zone: 1, line: "Zone one. Full sentences. The ghost is right there." },
  { gap: 2, zone: 2, line: "Zone two. Still comfortable, the ghost edges ahead." },
  { gap: 9, zone: 3, line: "Zone three. Short sentences only, and the gap opens." },
  { gap: 21, zone: 4, line: "Zone four. Four words at a time. The ghost eases to what you can hold." },
  { gap: 11, zone: 3, line: "It eased, and you are closing again." },
  { gap: 3, zone: 2, line: "Back on the ghost, at a pace you can actually finish on." },
];

export default function LandingDemo() {
  const [i, setI] = useState(0);
  const [gap, setGap] = useState(BEATS[0].gap);
  const timer = useRef(0);

  useEffect(() => {
    timer.current = window.setInterval(() => {
      setI((n) => (n + 1) % BEATS.length);
    }, 3200);
    return () => window.clearInterval(timer.current);
  }, []);

  // Ease the gap toward the beat rather than jumping, so the ghost slides.
  useEffect(() => {
    const target = BEATS[i].gap;
    let raf = 0;
    const step = () => {
      setGap((g) => {
        const next = g + (target - g) * 0.08;
        if (Math.abs(target - next) > 0.05) raf = window.requestAnimationFrame(step);
        return next;
      });
    };
    raf = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(raf);
  }, [i]);

  const beat = BEATS[i];
  const zone = ZONES.find((z) => z.id === beat.zone) ?? ZONES[0];

  return (
    <div className="ldemo">
      <GhostView gapSeconds={gap} zoneColour={zone.colour} running />
      <div className="ldemo-bar">
        <span className="ldemo-chip" style={{ "--z": zone.colour }}>
          {zone.name}
        </span>
        <span className="ldemo-line">{beat.line}</span>
      </div>
      <p className="ldemo-note">
        A scripted walkthrough of the mechanic, running live in your browser. Take a real
        reading and it does this from your own breathing.
      </p>
    </div>
  );
}
