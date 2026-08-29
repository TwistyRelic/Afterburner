import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GhostView from "../GhostView.jsx";
import { useBreath } from "../useBreath.js";
import { ZONES } from "../breath.js";

const EASE = [0.16, 1, 0.3, 1];

const fmt = (s) => {
  if (!Number.isFinite(s)) return "0:00";
  const w = Math.round(s);
  return Math.floor(w / 60) + ":" + String(w % 60).padStart(2, "0");
};

const DISTANCES = [3, 5, 10, 21.1];
const INTENTS = [
  { id: "easy", label: "Easy" },
  { id: "threshold", label: "Threshold" },
  { id: "intervals", label: "Intervals" },
];

export default function Ghost() {
  const breath = useBreath();
  const [phase, setPhase] = useState("setup"); // setup | live
  const [distanceKm, setDistanceKm] = useState(5);
  const [goalMin, setGoalMin] = useState(25);
  const [intent, setIntent] = useState("easy");

  const [elapsed, setElapsed] = useState(0);
  const [targetPace, setTargetPace] = useState(300);
  const [yourPace, setYourPace] = useState(300);
  const [doneKm, setDoneKm] = useState(0);
  const [log, setLog] = useState([]);
  const seen = useRef(null);
  const timer = useRef(0);

  const openingPace = (goalMin * 60) / distanceKm;

  const start = () => {
    setTargetPace(openingPace);
    setYourPace(openingPace);
    setElapsed(0);
    setDoneKm(0);
    setLog([]);
    seen.current = null;
    setPhase("live");
  };

  const stop = () => {
    // Keep the run so it appears in your history.
    try {
      const runs = JSON.parse(window.localStorage.getItem("afterburner.runs") || "[]");
      runs.unshift({
        id: "run-" + runs.length,
        distanceKm: Number(doneKm.toFixed(2)),
        goalKm: distanceKm,
        seconds: elapsed,
        avgPace: Math.round(yourPace),
        ghostPace: Math.round(targetPace),
        adjustments: log.length,
        at: new Date().toISOString(),
      });
      window.localStorage.setItem("afterburner.runs", JSON.stringify(runs.slice(0, 40)));
    } catch {
      /* storage full or unavailable */
    }
    setPhase("setup");
  };

  useEffect(() => {
    if (phase !== "live") return undefined;
    timer.current = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(timer.current);
  }, [phase]);

  // Distance accumulates at whatever pace you are actually holding.
  useEffect(() => {
    if (phase !== "live") return;
    setDoneKm((d) => d + 1 / yourPace);
  }, [elapsed, phase, yourPace]);

  // A talk test reading re-paces the ghost, bounded so one reading cannot swing it.
  useEffect(() => {
    const r = breath.result;
    if (!r || !r.zone || phase !== "live") return;
    if (seen.current === r.at) return;
    seen.current = r.at;

    const z = r.zone;
    const soft = intent === "easy" || intent === "long";
    const move = z.id >= 4 ? (soft ? 16 : 10) : z.id === 3 ? (soft ? 6 : 0) : z.id <= 2 ? -6 : 0;

    setTargetPace((p) => Math.max(150, Math.min(900, p + move)));
    setLog((l) => [
      {
        at: r.at,
        colour: z.colour,
        line:
          move > 0
            ? "Breathing says " + z.name.toLowerCase() + ". Ghost eased " + move + " seconds per km."
            : move < 0
              ? "Room to push. Ghost quickened " + Math.abs(move) + " seconds per km."
              : "Holding. Ghost unchanged.",
      },
      ...l,
    ]);
    // Your own pace drifts toward what the reading implies.
    setYourPace((p) => p + ((240 + z.id * 24) - p) * 0.5);
  }, [breath.result, phase, intent]);

  const gapSeconds = ((yourPace - targetPace) * elapsed) / 60;
  const zone = breath.result?.zone ?? null;
  const colour = zone ? zone.colour : "#3AA0FF";
  const projected = (targetPace * distanceKm) / 60;

  if (phase === "setup") {
    return (
      <div className="ghostpage">
        <motion.header
          className="ghost-head"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <h1>Set your run</h1>
          <p>The ghost starts on the pace your goal implies, then moves with your breathing.</p>
        </motion.header>

        <div className="setup-block">
          <span className="setup-label">Distance</span>
          <div className="chip-row">
            {DISTANCES.map((d) => (
              <button
                key={d}
                type="button"
                className={d === distanceKm ? "chip on" : "chip"}
                onClick={() => setDistanceKm(d)}
              >
                {d === 21.1 ? "Half" : d + " km"}
              </button>
            ))}
          </div>
        </div>

        <div className="setup-block">
          <span className="setup-label">Goal time</span>
          <div className="stepper">
            <button type="button" onClick={() => setGoalMin((m) => Math.max(8, m - 1))}>−</button>
            <span className="stepper-val">{goalMin} min</span>
            <button type="button" onClick={() => setGoalMin((m) => Math.min(240, m + 1))}>+</button>
          </div>
          <span className="setup-note">That is {fmt(openingPace)} per kilometre.</span>
        </div>

        <div className="setup-block">
          <span className="setup-label">What is today meant to be?</span>
          <div className="chip-row">
            {INTENTS.map((o) => (
              <button
                key={o.id}
                type="button"
                className={o.id === intent ? "chip on" : "chip"}
                onClick={() => setIntent(o.id)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <button type="button" className="gate-submit big-start" onClick={start}>
          Start the run
        </button>

        <p className="honest-note">
          Nothing is preloaded. The ghost appears when you start, and every number after
          that comes from this run.
        </p>
      </div>
    );
  }

  return (
    <div className="ghostpage">
      <div className="live-bar">
        <span className="live-dot" aria-hidden="true" />
        <span>Live · {fmt(elapsed)} elapsed</span>
        <button type="button" className="live-stop" onClick={stop}>End run</button>
      </div>

      <GhostView
        gapSeconds={gapSeconds}
        zoneColour={colour}
        running
        ghostPace={targetPace}
        yourPace={yourPace}
        distanceKm={doneKm}
      />

      <div className="ghost-stats">
        <div>
          <span className="metric-value">{projected.toFixed(1)}</span>
          <span className="metric-label">projected finish, minutes</span>
        </div>
        <div>
          <span className="metric-value">{distanceKm} km</span>
          <span className="metric-label">goal, {goalMin} minutes</span>
        </div>
      </div>

      <button
        type="button"
        className="gate-submit"
        onClick={breath.state === "listening" ? breath.stop : breath.start}
      >
        {breath.state === "listening"
          ? "Listening, " + Math.max(0, Math.ceil(breath.sampleSeconds - breath.elapsed)) + "s"
          : "Take a talk test"}
      </button>

      {zone && (
        <p className="ghost-zone" style={{ "--z": colour }}>
          Last reading: <strong>{zone.name}</strong>, zone {zone.id} of {ZONES.length}
        </p>
      )}

      <AnimatePresence initial={false}>
        {log.length > 0 && (
          <motion.div className="ghost-log" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <span className="plate-label">What moved the ghost</span>
            {log.map((e) => (
              <motion.div
                className="ghost-log-row"
                key={e.at}
                style={{ "--z": e.colour }}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
              >
                {e.line}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
