import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TEST_SENTENCE, ZONES } from "../breath.js";
import { useBreath } from "../useBreath.js";
import { distanceMeters } from "../movement.js";
import {
  DUR,
  EASE,
  exitTransition,
  useCountUp,
  useReducedMotion,
} from "../motion.js";
import {
  BOUNDS,
  INTENTS,
  applyReading,
  createPlan,
  describeReading,
  formatClock,
  formatDelta,
  formatPace,
  gapToSegmentedGhost,
  projectedFinish,
} from "../ghostPacing.js";

// The talk test asks for itself on this schedule once the microphone has been
// granted once. The FIRST one is always a tap, because a browser will not open
// the microphone without a gesture, and pretending otherwise would fail
// silently at exactly the moment the runner cannot look at the phone.
const FIRST_PROMPT_AFTER = 120;
const PROMPT_EVERY = 300;

const DISTANCES = [
  { km: 5, label: "5 km" },
  { km: 10, label: "10 km" },
  { km: 16.1, label: "10 miles" },
  { km: 21.1, label: "Half" },
];

// A position fix worse than this is not good enough to add to a distance total,
// and anything implying more than 8 m/s is a jump rather than a stride.
const WORST_ACCURACY_M = 25;
const MAX_SPEED_MS = 8;

const CSS = `
.abp {
  position: relative;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto auto auto auto;
  gap: 10px;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  /* Both bars take their clearance out of this padding rather than pushing the
     page, because nothing in here is allowed to scroll. Measured at 390x844:
     without the tabbar reserve the bottom tab bar painted over the prompt
     toggle and made it unreadable and untappable. */
  padding: calc(var(--ab-nav-h, 64px) + 8px) 12px
    calc(var(--tabbar-h, 0px) + env(safe-area-inset-bottom, 0px) + 10px);
  background: #0B0D10;
  color: #EDF1F6;
  font-variant-numeric: tabular-nums;
}

.abp-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 14px;
  border: 1px solid #232A34;
  border-radius: 14px;
  background: #151A21;
}

.abp-label {
  font-size: 14px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #9BA6B5;
}

.abp-clock {
  font-size: 26px;
  font-weight: 700;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.abp-clock small { font-size: 16px; font-weight: 600; color: #9BA6B5; }

.abp-flag {
  padding: 4px 9px;
  border: 1px solid #FF8A3D;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #FF8A3D;
}

/* THE STAGE. Every pixel of it is the talk test trigger, so it can be hit
   through a pocket or on an armband, without aiming and without looking. */
.abp-stage {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
  min-height: 0;
  margin: 0;
  padding: 16px 12px 14px;
  border: 1px solid #232A34;
  border-radius: 20px;
  background: #151A21;
  color: inherit;
  font: inherit;
  text-align: center;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transform: scale(1);
  transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
}
.abp-stage:active { transform: scale(0.97); }
.abp-stage:focus-visible { outline: 3px solid #FF4D2D; outline-offset: 3px; }

.abp-zonebar {
  position: absolute;
  top: 0;
  left: 16px;
  right: 16px;
  height: 5px;
  border-radius: 0 0 5px 5px;
}

.abp-hero {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: clamp(58px, 21vw, 86px);
  font-weight: 800;
  line-height: 0.95;
  letter-spacing: -0.03em;
}

.abp-hero small { font-size: 20px; font-weight: 600; letter-spacing: 0; color: #9BA6B5; }

.abp-heroLabel {
  font-size: 14px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #9BA6B5;
}

.abp-gap {
  display: flex;
  align-items: baseline;
  gap: 7px;
  margin-top: 12px;
  font-size: 30px;
  font-weight: 700;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.abp-gap span { font-size: 17px; font-weight: 600; letter-spacing: 0.05em; }

.abp-tap {
  margin-top: 18px;
  padding-top: 0;
  font-size: 18px;
  font-weight: 600;
  color: #9BA6B5;
}

.abp-count {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: clamp(68px, 25vw, 104px);
  font-weight: 800;
  line-height: 1;
}

.abp-sentence { max-width: 22ch; font-size: 19px; line-height: 1.35; }

.abp-level {
  width: 76%;
  height: 8px;
  margin-top: 14px;
  border-radius: 999px;
  background: #232A34;
  overflow: hidden;
}
.abp-level i {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 999px;
  background: #FF4D2D;
  transform-origin: 0 50%;
}

.abp-cells {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border: 1px solid #232A34;
  border-radius: 14px;
  background: #151A21;
  overflow: hidden;
}
.abp-cell { padding: 9px 14px; }
.abp-cell + .abp-cell { border-left: 1px solid #232A34; }
.abp-cellValue {
  margin-top: 1px;
  font-size: 26px;
  font-weight: 700;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
.abp-cellNote { font-size: 14px; color: #9BA6B5; }

.abp-verdict {
  padding: 10px 14px;
  border: 1px solid #232A34;
  border-left: 4px solid #232A34;
  border-radius: 12px;
  background: #151A21;
  font-size: 18px;
  line-height: 1.35;
}

.abp-controls { display: flex; gap: 8px; }

.abp-btn {
  flex: 1 1 auto;
  min-height: 56px;
  padding: 0 18px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: #FF4D2D;
  color: #0B0D10;
  font-size: 19px;
  font-weight: 800;
  cursor: pointer;
  transform: translateY(0);
  transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
}
.abp-btn:active { transform: translateY(1px); }
.abp-btn:focus-visible { outline: 3px solid #EDF1F6; outline-offset: 3px; }

.abp-btn.is-quiet {
  flex: 0 0 auto;
  border-color: #232A34;
  background: #151A21;
  color: #EDF1F6;
  font-weight: 600;
}

/* The whole row is the target, not the box: a label containing its own input
   toggles it, so the hit area is 366 by 48 rather than a 24px square. */
.abp-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 48px;
  padding: 0 12px;
  border: 1px solid #232A34;
  border-radius: 12px;
  font-size: 16px;
  color: #9BA6B5;
  cursor: pointer;
}
.abp-toggle input {
  flex: 0 0 24px;
  width: 24px;
  height: 24px;
  accent-color: #FF4D2D;
}
.abp-toggle:focus-within { outline: 3px solid #FF4D2D; outline-offset: 2px; }

/* SETUP. The same shell, so starting a run does not move anything the eye is
   already using. */
.abp-setup {
  display: flex;
  flex-direction: column;
  /* NOT centred. This scrolls, and justify-content: center on a scroll
     container clips both ends and makes the top unreachable. Measured at
     390x844: the heading and the selected distance were off the top. */
  justify-content: flex-start;
  gap: 12px;
  padding: 14px;
  border: 1px solid #232A34;
  border-radius: 20px;
  background: #151A21;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.abp-setup h1 { margin: 0; font-size: 21px; line-height: 1.15; letter-spacing: -0.01em; }

.abp-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }

.abp-chip {
  min-height: 46px;
  padding: 0 13px;
  border: 1px solid #232A34;
  border-radius: 999px;
  background: #0B0D10;
  color: #9BA6B5;
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}
.abp-chip.is-on {
  border-color: #FF4D2D;
  background: rgba(255, 77, 45, 0.14);
  color: #EDF1F6;
}
.abp-chip:focus-visible { outline: 3px solid #FF4D2D; outline-offset: 2px; }

.abp-stepper { display: flex; align-items: center; gap: 10px; margin-top: 6px; }
.abp-step {
  /* Measured at 390px: without the no-shrink these squeezed to 43px wide in the
     flex row and fell under the 44px target minimum. */
  flex: 0 0 52px;
  width: 52px;
  height: 52px;
  border: 1px solid #232A34;
  border-radius: 14px;
  background: #0B0D10;
  color: #EDF1F6;
  font-size: 26px;
  font-weight: 700;
  cursor: pointer;
}
.abp-step:focus-visible { outline: 3px solid #FF4D2D; outline-offset: 2px; }

.abp-goal {
  min-width: 86px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 29px;
  font-weight: 700;
  text-align: center;
}

.abp-fine { margin: 0; font-size: 15px; line-height: 1.45; color: #9BA6B5; }

.abp-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

@media (max-height: 720px) {
  .abp { gap: 8px; }
  .abp-verdict { font-size: 17px; }
  .abp-cellValue { font-size: 22px; }
  .abp-gap { margin-top: 6px; }
}

@media (prefers-reduced-motion: reduce) {
  .abp-stage,
  .abp-btn { transition-duration: 1ms; }
}
`;

const zoneById = (id) => ZONES.find((zone) => zone.id === id) || null;

function speak(text) {
  if (typeof window === "undefined") return;
  const synth = window.speechSynthesis;
  if (!synth || !window.SpeechSynthesisUtterance) return;
  try {
    synth.cancel();
    const said = new window.SpeechSynthesisUtterance(text);
    said.rate = 1.02;
    synth.speak(said);
  } catch {
    // A refused speech synthesiser is not a reason to stop the run.
  }
}

export default function Pace() {
  const still = useReducedMotion();
  const breath = useBreath();

  const [distanceKm, setDistanceKm] = useState(10);
  const [goalMinutes, setGoalMinutes] = useState(50);
  const [intent, setIntent] = useState("easy");

  const [plan, setPlan] = useState(null);
  const [startedAt, setStartedAt] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [doneKm, setDoneKm] = useState(0);
  const [gpsKm, setGpsKm] = useState(null); // null until a real fix has landed
  const [voice, setVoice] = useState(true);
  const [armed, setArmed] = useState(false); // the microphone has been granted
  const [noSpeech, setNoSpeech] = useState(false);

  const lastReadingRef = useRef(null);
  const nextPromptRef = useRef(FIRST_PROMPT_AFTER);
  const planRef = useRef(null);
  planRef.current = plan;

  const running = Boolean(plan) && startedAt > 0;
  const goalSeconds = goalMinutes * 60;
  const openingPace = goalSeconds / distanceKm;

  // THE CLOCK. Real wall time, so a backgrounded tab cannot lose seconds.
  useEffect(() => {
    if (!running) return undefined;
    const tick = () => setElapsed((Date.now() - startedAt) / 1000);
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [running, startedAt]);

  // DISTANCE, MEASURED. Every accepted fix adds a real haversine leg. A fix with
  // poor accuracy, or one implying a sprint no human runs, is thrown away.
  useEffect(() => {
    if (!running || !navigator.geolocation) return undefined;
    let previous = null;
    let total = 0;

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const fix = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: position.timestamp,
          accuracy: position.coords.accuracy,
        };
        if (fix.accuracy != null && fix.accuracy > WORST_ACCURACY_M) return;
        if (previous) {
          const metres = distanceMeters(previous, fix);
          const seconds = Math.max(0.001, (fix.timestamp - previous.timestamp) / 1000);
          if (metres / seconds <= MAX_SPEED_MS) total += metres;
        }
        previous = fix;
        setGpsKm(total / 1000);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );

    return () => navigator.geolocation.clearWatch(id);
  }, [running]);

  // Where the distance number comes from. A real fix always wins. With no fix
  // the screen still works, and it says plainly that the distance is simulated
  // from the clock at the pace the ghost is asking for. It is never presented
  // as a measurement.
  const simulated = gpsKm == null;
  useEffect(() => {
    if (!running) return;
    if (gpsKm != null) {
      setDoneKm(Math.min(distanceKm, gpsKm));
      return;
    }
    const pace = planRef.current ? planRef.current.targetPace : 300;
    setDoneKm(Math.min(distanceKm, elapsed / pace));
  }, [running, gpsKm, elapsed, distanceKm]);

  const finish = useMemo(
    () => (plan ? projectedFinish(distanceKm, doneKm, elapsed, plan.targetPace) : null),
    [plan, distanceKm, doneKm, elapsed],
  );

  const gap = useMemo(
    () => (plan ? gapToSegmentedGhost(plan.segments, elapsed, doneKm) : null),
    [plan, elapsed, doneKm],
  );

  const lastReading = plan && plan.readings.length ? plan.readings[0] : null;
  const lastZone = lastReading ? zoneById(lastReading.zoneId) : null;

  // The hero number is the house odometer: settled on first paint, and it rolls
  // only when a reading actually moves the pace.
  const heroPace = useCountUp(plan ? plan.targetPace : openingPace, {
    format: formatPace,
  });

  // The spoken sentence needs the current distance, but distance changes every
  // tick and must not be a dependency of the reading effect below, or that
  // effect would re-run twice a second.
  const doneKmRef = useRef(0);
  doneKmRef.current = doneKm;

  // A finished sample becomes a pace change, once, and is then spoken in the
  // same words that appear on the plate.
  useEffect(() => {
    const result = breath.result;
    if (!result) return;
    if (lastReadingRef.current === result.at) return;
    lastReadingRef.current = result.at;
    setArmed(true);

    // A sample with nothing loud enough to be speech in it is a real outcome
    // and it has to be said. Measured in a browser on a silent microphone: the
    // old code returned here and the plate went on reading "no reading yet",
    // so a runner whose microphone was covered got no answer and no reason.
    if (!result.zone) {
      setNoSpeech(true);
      if (voice) speak("I did not hear that. Say it again, a bit louder.");
      return;
    }
    setNoSpeech(false);

    setPlan((current) => {
      if (!current) return current;
      const seconds = startedAt > 0 ? (Date.now() - startedAt) / 1000 : 0;
      const next = applyReading(current, { zone: result.zone, elapsedSeconds: seconds });
      nextPromptRef.current = seconds + PROMPT_EVERY;
      if (voice) {
        const ahead = projectedFinish(
          current.distanceKm,
          doneKmRef.current,
          seconds,
          next.targetPace,
        );
        speak(describeReading(next.readings[0], ahead ? ahead.finishSeconds : null));
      }
      return next;
    });
  }, [breath.result, startedAt, voice]);

  const runTest = useCallback(() => {
    if (breath.state === "listening") {
      breath.stop();
      return;
    }
    setNoSpeech(false);
    if (voice) speak("Talk test. Read the sentence.");
    breath.start();
  }, [breath, voice]);

  // THE PROMPT. Once the microphone has been granted once, the run asks for the
  // next reading out loud on a schedule, so a talk test needs no screen and no
  // hands. It only ever runs inside a run the runner started, and the toggle at
  // the bottom of the screen turns it off.
  useEffect(() => {
    if (!running || !armed || !voice) return undefined;
    const id = window.setInterval(() => {
      const seconds = (Date.now() - startedAt) / 1000;
      if (seconds < nextPromptRef.current) return;
      if (breath.state === "listening") return;
      nextPromptRef.current = seconds + PROMPT_EVERY;
      speak("Talk test. Read the sentence.");
      window.setTimeout(() => breath.start(), 1800);
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, armed, voice, startedAt, breath]);

  const start = () => {
    const made = createPlan({ distanceKm, goalSeconds, intent });
    if (!made) return;
    lastReadingRef.current = null;
    nextPromptRef.current = FIRST_PROMPT_AFTER;
    setNoSpeech(false);
    setPlan(made);
    setDoneKm(0);
    setGpsKm(null);
    setElapsed(0);
    setStartedAt(Date.now());
    if (voice) {
      speak(
        "Run started. The ghost is on " + formatPace(made.targetPace) +
          " per kilometre. Tap the screen when you are ready for the first talk test.",
      );
    }
  };

  const end = () => {
    if (breath.state === "listening") breath.stop();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setStartedAt(0);
    setPlan(null);
    setArmed(false);
    setNoSpeech(false);
    setElapsed(0);
    setDoneKm(0);
    setGpsKm(null);
  };

  const listening = breath.state === "listening";
  const countdown = Math.max(0, Math.ceil(breath.sampleSeconds - breath.elapsed));
  const zoneColour = lastZone ? lastZone.colour : "#232A34";
  const goalDelta = finish ? finish.finishSeconds - goalSeconds : 0;
  const enter = { duration: still ? 0 : DUR.reveal, ease: EASE };

  return (
    <div className="abp">
      <style>{CSS}</style>

      {/* ROW 1: the two things that are simply true, and where the distance came
          from. Never a guess wearing a measurement's clothes. */}
      <div className="abp-row">
        <div>
          <div className="abp-label">Elapsed</div>
          <div className="abp-clock">{formatClock(elapsed)}</div>
        </div>
        {running && simulated ? <span className="abp-flag">Sample</span> : null}
        <div style={{ textAlign: "right" }}>
          <div className="abp-label">Distance</div>
          <div className="abp-clock">
            {doneKm.toFixed(2)} <small>km</small>
          </div>
        </div>
      </div>

      {/* ROW 2: the stage. Before a run it is the setup. During a run it is the
          pace, the gap, and the whole talk test trigger. */}
      {!running ? (
        <div className="abp-setup">
          <h1>What is the run, and what is today meant to be?</h1>

          <div>
            <div className="abp-label" id="abp-dist">Distance</div>
            <div className="abp-chips" role="group" aria-labelledby="abp-dist">
              {DISTANCES.map((option) => (
                <button
                  key={option.km}
                  type="button"
                  className={distanceKm === option.km ? "abp-chip is-on" : "abp-chip"}
                  aria-pressed={distanceKm === option.km}
                  onClick={() => setDistanceKm(option.km)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="abp-label" id="abp-goal">Goal time</div>
            <div className="abp-stepper">
              <button
                type="button"
                className="abp-step"
                aria-label="One minute slower"
                onClick={() => setGoalMinutes((m) => Math.min(360, m + 1))}
              >
                +
              </button>
              <div className="abp-goal" role="status" aria-live="polite">
                {goalMinutes}:00
              </div>
              <button
                type="button"
                className="abp-step"
                aria-label="One minute faster"
                onClick={() => setGoalMinutes((m) => Math.max(5, m - 1))}
              >
                &minus;
              </button>
              <div className="abp-fine">
                Opening pace {formatPace(openingPace)} per km
              </div>
            </div>
          </div>

          <div>
            <div className="abp-label" id="abp-intent">Today is</div>
            <div className="abp-chips" role="group" aria-labelledby="abp-intent">
              {INTENTS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={intent === option.id ? "abp-chip is-on" : "abp-chip"}
                  aria-pressed={intent === option.id}
                  onClick={() => setIntent(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <p className="abp-fine">
            Read a sentence out loud during the run and the ghost re-paces around what
            your breathing says, by at most {Math.round(BOUNDS.maxEase)} s/km slower or{" "}
            {Math.round(BOUNDS.maxPush)} faster per reading at a five minute pace. This is
            the talk test, not a medical measurement. It does not diagnose or treat
            anything and it does not replace a clinician.
          </p>
        </div>
      ) : (
        <button
          type="button"
          className="abp-stage"
          onClick={runTest}
          aria-label={listening ? "Stop the talk test" : "Start a talk test"}
        >
          <span
            className="abp-zonebar"
            style={{ background: zoneColour }}
            aria-hidden="true"
          />

          {listening ? (
            <>
              <span className="abp-count">{countdown}</span>
              <span className="abp-sentence">{TEST_SENTENCE}</span>
              <span className="abp-level" aria-hidden="true">
                <i style={{ transform: `scaleX(${Math.min(1, breath.level * 14)})` }} />
              </span>
              <span className="abp-tap">Keep reading. Breathe when you need to.</span>
            </>
          ) : (
            <>
              <span className="abp-heroLabel">Ghost pace now</span>
              <span className="abp-hero">
                <span ref={heroPace.ref}>{heroPace.text}</span>
                <small>/km</small>
              </span>
              <span
                className="abp-gap"
                style={{ color: gap && gap.ahead ? "#4FD1A5" : "#FF8A3D" }}
              >
                {Math.abs(gap ? gap.metres : 0)}
                <span>m {gap && gap.ahead ? "ahead" : "behind"}</span>
                {Math.abs(gap ? gap.seconds : 0)}
                <span>s</span>
              </span>
              <span className="abp-tap">
                {armed ? "Tap anywhere, or wait to be asked" : "Tap anywhere to talk"}
              </span>
            </>
          )}
        </button>
      )}

      {/* ROW 3: the honest finish, against the one that was asked for. It only
          exists during a run: before one it would restate the goal twice and
          push the setup form below the fold, measured at 390x844. */}
      {running ? (
      <div className="abp-cells">
        <div className="abp-cell">
          <div className="abp-label">Finish</div>
          <div className="abp-cellValue">
            {formatClock(finish ? finish.finishSeconds : goalSeconds)}
          </div>
          <div className="abp-cellNote">if you hold this pace</div>
        </div>
        <div className="abp-cell">
          <div className="abp-label">Goal</div>
          <div className="abp-cellValue">{formatClock(goalSeconds)}</div>
          <div className="abp-cellNote">
            {running && Math.abs(goalDelta) >= 1
              ? formatClock(Math.abs(goalDelta)) + (goalDelta > 0 ? " over" : " under")
              : "on the goal"}
          </div>
        </div>
      </div>
      ) : null}

      {/* ROW 4: what the last reading did, in the words it was spoken in. */}
      {running ? (
      <div
        className="abp-verdict"
        style={{ borderLeftColor: zoneColour }}
        role="status"
        aria-live="polite"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={noSpeech ? "nospeech" : lastReading ? lastReading.at : "none"}
            style={{ display: "block" }}
            initial={{ opacity: 0, y: still ? 0 : 6 }}
            animate={{ opacity: 1, y: 0, transition: enter }}
            exit={{ opacity: 0, transition: exitTransition(DUR.reveal) }}
          >
            {noSpeech ? (
              <>
                <strong style={{ color: "#FF8A3D" }}>Nothing to measure.</strong> That
                sample had no speech loud enough to read. The ghost has not moved. Tap
                and say it again, a bit louder.
              </>
            ) : lastReading && lastZone ? (
              <>
                <strong style={{ color: lastZone.colour }}>
                  Zone {lastZone.id}, {lastZone.name.toLowerCase()}.
                </strong>{" "}
                {lastReading.direction === "hold"
                  ? "That is where this session should be, so the ghost holds."
                  : formatDelta(lastReading.deltaSeconds) + ", " + lastReading.reason + "."}
                {lastReading.capped
                  ? " Capped at one step, so it moves again at the next reading."
                  : ""}
              </>
            ) : (
              <>
                No reading yet. The ghost runs the pace your goal implies until it
                has heard you.
              </>
            )}
          </motion.span>
        </AnimatePresence>
      </div>
      ) : null}

      {/* ROW 5: the controls, thumb height, at the bottom edge. */}
      <div className="abp-controls">
        {!running ? (
          <button type="button" className="abp-btn" onClick={start}>
            Start the run
          </button>
        ) : (
          <>
            <button type="button" className="abp-btn" onClick={runTest}>
              {listening ? "Stop, use what I said" : "Talk test"}
            </button>
            <button type="button" className="abp-btn is-quiet" onClick={end}>
              End
            </button>
          </>
        )}
      </div>

      <label className="abp-toggle">
        <input
          type="checkbox"
          checked={voice}
          onChange={(event) => setVoice(event.target.checked)}
        />
        Ask me out loud, about every {Math.round(PROMPT_EVERY / 60)} minutes
        {breath.error ? ". " + breath.error : ""}
      </label>

      <p className="abp-sr">
        The zone comes from how long you speak between breaths. It is the talk test, a
        coaching method, and not a medical measurement. Nothing here diagnoses or treats
        any condition, including asthma, and it does not replace a clinician.
      </p>
    </div>
  );
}
