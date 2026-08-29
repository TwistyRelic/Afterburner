// THE GOAL SCREEN
//
// Set a run up in under fifteen seconds and go. Everything on it is either a
// choice the runner makes or a number computed from those choices, and the one
// optional field is answered in ordinary words and used for exactly two things,
// both of which are printed on the screen next to it.
//
// Nothing here autoplays, nothing is tied to scroll position and nothing is
// revealed on entry, so the first paint is the settled screen. The only motion
// is a control acknowledging a finger.
//
// Its styles live in index.css with every other page's, under the .abset
// prefix. A page carrying its own <style> block was how three of the five
// builds ended up with three different accents.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BOUNDS, INTENTS, formatClock, formatPace } from "../ghostPacing.js";
import {
  BREATHING_FACTORS,
  DISTANCE_MAX,
  DISTANCE_MIN,
  DISTANCE_PRESETS,
  GOAL_MAX_SECONDS,
  GOAL_MIN_SECONDS,
  describeSoftening,
  intentBand,
  intentLabel,
  loadSetup,
  openingPaceFor,
  railNote,
  requestStart,
  saveSetup,
  softeningFor,
  summaryLine,
} from "../runSetup.js";

// What one press of each control is worth. The presets cover the distances
// people actually enter, so the stepper only has to reach the ones in between.
const DISTANCE_TAP = 0.5;
const GOAL_TAP = 60;
const GOAL_NUDGE = 15;
const GOAL_JUMP = 300;

const snap = (value, step) => Math.round(value / step) * step;
const round1 = (value) => Math.round(value * 10) / 10;
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

export default function Goal() {
  const navigate = useNavigate();

  // Last time is the starting point, so the second run is one press. A pure
  // read, safe to run twice, which the strict development double render does.
  const saved = useMemo(() => loadSetup(), []);
  const [distanceKm, setDistanceKm] = useState(saved.distanceKm);
  const [goalSeconds, setGoalSeconds] = useState(saved.goalSeconds);
  const [intent, setIntent] = useState(saved.intent);
  const [factors, setFactors] = useState(saved.factors);

  const setup = useMemo(
    () => ({ distanceKm, goalSeconds, intent, factors }),
    [distanceKm, goalSeconds, intent, factors],
  );

  // Kept in this browser on this phone. There is no network call in this app.
  useEffect(() => {
    saveSetup(setup);
  }, [setup]);

  const soft = useMemo(() => softeningFor(intent, factors), [intent, factors]);
  const opening = openingPaceFor(setup);
  const rail = railNote(setup);
  const summary = summaryLine(setup);

  // THE BOTTOM BAR, MEASURED RATHER THAN ASSUMED. The app has a --tabbar-h
  // token that outlived the bar it described, so this reads the real element.
  // If the bar comes back, the reserve comes back with it.
  const [barHeight, setBarHeight] = useState(0);
  useEffect(() => {
    const measure = () => {
      const bar = document.querySelector(".tabbar");
      setBarHeight(bar ? Math.round(bar.getBoundingClientRect().height) : 0);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const stepDistance = useCallback((delta) => {
    setDistanceKm((current) =>
      round1(clamp(snap(current + delta, DISTANCE_TAP), DISTANCE_MIN, DISTANCE_MAX)),
    );
  }, []);

  const stepGoal = useCallback((delta) => {
    setGoalSeconds((current) =>
      clamp(current + delta, GOAL_MIN_SECONDS, GOAL_MAX_SECONDS),
    );
  }, []);

  const toggleFactor = useCallback((id) => {
    setFactors((current) =>
      current.includes(id)
        ? current.filter((held) => held !== id)
        : [...current, id],
    );
  }, []);

  const start = useCallback(() => {
    // Save what is on the screen, hand the same normalised object to the run,
    // and go. The run screen starts the clock on arrival because this press is
    // the start: it is never started by a reload or by a link.
    const ready = saveSetup(setup);
    requestStart(ready);
    navigate("/pace");
  }, [navigate, setup]);

  const atDistanceFloor = distanceKm <= DISTANCE_MIN + 0.001;
  const atDistanceCeiling = distanceKm >= DISTANCE_MAX - 0.001;
  const atGoalFloor = goalSeconds <= GOAL_MIN_SECONDS;
  const atGoalCeiling = goalSeconds >= GOAL_MAX_SECONDS;

  return (
    <div className="abset" style={{ "--abset-bar": barHeight + "px" }}>
      <header className="abset-head">
        <h1>Set the run</h1>
        <p className="abset-lede">
          Three choices, then go. The ghost opens on the pace your goal implies,
          then re-paces itself every time it hears you speak.
        </p>
      </header>

      <section className="abset-panel">
        <div className="abset-label" id="abset-distance">
          Distance
        </div>

        <div className="abset-chips" role="group" aria-labelledby="abset-distance">
          {DISTANCE_PRESETS.map((preset) => (
            <button
              key={preset.km}
              type="button"
              className={distanceKm === preset.km ? "abset-pick is-on" : "abset-pick"}
              aria-pressed={distanceKm === preset.km}
              onClick={() => setDistanceKm(preset.km)}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="abset-stepper">
          <button
            type="button"
            className="abset-step"
            aria-label="Shorter by half a kilometre"
            disabled={atDistanceFloor}
            onClick={() => stepDistance(-DISTANCE_TAP)}
          >
            &minus;
          </button>
          <div className="abset-value" role="status" aria-live="polite">
            {distanceKm.toFixed(1)} <span className="abset-unit">km</span>
          </div>
          <button
            type="button"
            className="abset-step"
            aria-label="Longer by half a kilometre"
            disabled={atDistanceCeiling}
            onClick={() => stepDistance(DISTANCE_TAP)}
          >
            +
          </button>
        </div>
      </section>

      <section className="abset-panel">
        <div className="abset-label" id="abset-goaltime">
          Goal time
        </div>

        <div className="abset-stepper">
          <button
            type="button"
            className="abset-step"
            aria-label="One minute faster"
            disabled={atGoalFloor}
            onClick={() => stepGoal(-GOAL_TAP)}
          >
            &minus;
          </button>
          <div className="abset-value" role="status" aria-live="polite">
            {formatClock(goalSeconds)}
          </div>
          <button
            type="button"
            className="abset-step"
            aria-label="One minute slower"
            disabled={atGoalCeiling}
            onClick={() => stepGoal(GOAL_TAP)}
          >
            +
          </button>
        </div>

        <div className="abset-mini" role="group" aria-labelledby="abset-goaltime">
          <button
            type="button"
            className="abset-miniBtn"
            aria-label="Five minutes faster"
            onClick={() => stepGoal(-GOAL_JUMP)}
          >
            &minus;5 min
          </button>
          <button
            type="button"
            className="abset-miniBtn"
            aria-label="Fifteen seconds faster"
            onClick={() => stepGoal(-GOAL_NUDGE)}
          >
            &minus;15 s
          </button>
          <button
            type="button"
            className="abset-miniBtn"
            aria-label="Fifteen seconds slower"
            onClick={() => stepGoal(GOAL_NUDGE)}
          >
            +15 s
          </button>
          <button
            type="button"
            className="abset-miniBtn"
            aria-label="Five minutes slower"
            onClick={() => stepGoal(GOAL_JUMP)}
          >
            +5 min
          </button>
        </div>

        <p className="abset-note">
          Opening pace{" "}
          <strong>{opening == null ? "none" : formatPace(opening)} per km</strong>.
          That is where the ghost starts, not where it has to finish.
        </p>
        {rail ? <p className="abset-note is-warn">{rail}</p> : null}
      </section>

      <section className="abset-panel">
        <div className="abset-label" id="abset-intent">
          Today is
        </div>

        <div className="abset-chips" role="group" aria-labelledby="abset-intent">
          {INTENTS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={intent === option.id ? "abset-pick is-on" : "abset-pick"}
              aria-pressed={intent === option.id}
              onClick={() => setIntent(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <p className="abset-note">
          {intentLabel(intent)} sits in <strong>{intentBand(intent)}</strong>. Above
          that band the ghost eases, inside it the ghost holds, and below it, once
          about a third of your goal time has gone, the ghost pushes.
        </p>
        <p className="abset-fine">
          One reading moves the ghost by at most {Math.round(BOUNDS.maxEase)} s/km
          slower or {Math.round(BOUNDS.maxPush)} s/km faster, at a five minute pace.
        </p>
      </section>

      <section className="abset-panel">
        <div className="abset-label" id="abset-breathing">
          Anything affecting your breathing today{" "}
          <span className="abset-optional">(optional)</span>
        </div>

        <div className="abset-chips" role="group" aria-labelledby="abset-breathing">
          <button
            type="button"
            className={factors.length === 0 ? "abset-pick is-on" : "abset-pick"}
            aria-pressed={factors.length === 0}
            onClick={() => setFactors([])}
          >
            Nothing today
          </button>
          {BREATHING_FACTORS.map((factor) => (
            <button
              key={factor.id}
              type="button"
              className={
                factors.includes(factor.id) ? "abset-pick is-on" : "abset-pick"
              }
              aria-pressed={factors.includes(factor.id)}
              onClick={() => toggleFactor(factor.id)}
            >
              {factor.label}
            </button>
          ))}
        </div>

        <p className="abset-note" role="status" aria-live="polite">
          {describeSoftening(soft)}
        </p>
        <p className="abset-fine">
          That is the whole of what it does. It does not change the zone your voice
          measures, it does not change your goal time, and it is kept in this browser
          on this phone. Nothing here is sent anywhere.
        </p>

        <p className="abset-medical">
          <strong>Not medical advice.</strong> This is the talk test, a coaching
          method. It does not diagnose or treat anything, including asthma, and it
          does not replace your clinician. If you have a breathing condition, follow
          the advice they have given you, carry whatever they told you to carry, and
          stop if you feel unwell.
        </p>
      </section>

      <Link className="abset-quiet" to="/pace">
        Open the run screen without starting a run
      </Link>

      <div className="abset-go">
        <p className="abset-summary">{summary}</p>
        <button type="button" className="abset-start" onClick={start}>
          Start the run
        </button>
      </div>

      <p className="abset-sr">
        Starting opens the run screen and starts the clock. During the run you read
        one sentence out loud when the app asks, and the ghost re-paces itself around
        what your breathing says.
      </p>
    </div>
  );
}
