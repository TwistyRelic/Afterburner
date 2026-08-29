import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { distanceMeters } from "./movement.js";
import {
  INTENTS,
  applyReading,
  createPlan,
  elapsedFractionFor,
  gapToSegmentedGhost,
  projectedFinish,
  targetPace,
} from "./ghostPacing.js";
import { normaliseSetup, softeningFor } from "./runSetup.js";

// THE RUN, HELD IN ONE PLACE
//
// One hook owns the goal, the clock, the distance and the ghost's history of
// changing its mind. Every number it hands back either came from a sensor or
// from ghostPacing.js, which is pure. There is no arithmetic in here that the
// screen could disagree with, and there is no arithmetic in the screen.
//
// WHERE DISTANCE COMES FROM, and it is never a guess wearing a measurement's
// clothes. `distanceSource` says which of three things is true:
//   "gps"     a real position fix has landed and legs are being added up
//   "manual"  geolocation is refused or silent and the runner is tapping
//             "I have done a kilometre" as they pass each marker
//   "none"    neither, so distance is 0 and the screen must say so
// A tap is the runner's own report and is treated as real. What is NOT here,
// deliberately, is a distance simulated from the clock. That number always
// looks perfect, because it is the ghost's own pace played back at itself, and
// a runner who by definition ran the ghost's pace has no gap worth showing.
//
// NOT MEASURED, and worth saying out loud: no part of this has run outdoors.
// The accuracy filter and the jump filter below are written and unexercised.

// A fix worse than this is not good enough to add to a distance total. 25 m is
// roughly where a phone in a city stops being able to tell one side of a road
// from the other.
export const WORST_ACCURACY_M = 25;

// Anything implying more than 8 m/s between two fixes is a jump, not a stride:
// that is 2:05 per kilometre, which is faster than the world record for any
// distance. It is a bad fix and it is thrown away rather than banked.
export const MAX_SPEED_MS = 8;

// One tap is one kilometre, because a kilometre marker is the thing a runner
// actually passes. Anything finer would be asking them to estimate.
export const MANUAL_LAP_KM = 1;

// Half a second. The clock reads wall time on every tick rather than counting
// its own ticks, so a phone that sleeps the timer cannot lose seconds.
const TICK_MS = 500;

const finite = (value) => typeof value === "number" && Number.isFinite(value);

export function useGhost(options = {}) {
  // THE GOAL. These are the four things the runner sets before starting, and
  // they are frozen for the duration of a run: a goal you can edit at mile
  // eight is not a goal, and the plan's rails are anchored to the pace this
  // implied at the start.
  const [distanceKm, setDistanceKmState] = useState(options.distanceKm ?? 10);
  const [goalSeconds, setGoalSecondsState] = useState(options.goalSeconds ?? 3000);
  const [intent, setIntentState] = useState(options.intent ?? "easy");
  const [factors, setFactorsState] = useState(options.factors ?? []);

  // THE RUN.
  const [plan, setPlan] = useState(null);
  const [startedAt, setStartedAt] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [ended, setEnded] = useState(false);

  // THE DISTANCE. gpsKm stays null until a fix has actually been accepted, and
  // null is the whole signal: it is how the screen knows not to claim a
  // measurement it does not have.
  const [gpsKm, setGpsKm] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [fixes, setFixes] = useState(0);
  const [geoError, setGeoError] = useState("");
  const [laps, setLaps] = useState([]);

  // Mirrors of the state that callbacks read at the moment they fire rather
  // than at the moment they were created. A talk test finishing has to be
  // stamped against the run as it is now, not as it was when the button was
  // last re-rendered.
  const planRef = useRef(null);
  const startedAtRef = useRef(0);
  const lapsRef = useRef([]);
  const doneRef = useRef(0);
  planRef.current = plan;
  startedAtRef.current = startedAt;
  lapsRef.current = laps;

  const running = Boolean(plan) && startedAt > 0 && !ended;
  const finished = Boolean(plan) && ended;
  const supported =
    typeof navigator !== "undefined" && Boolean(navigator.geolocation);

  // THE SOFTENING. What a declared breathing factor does lives in runSetup.js
  // so the goal screen and the run screen cannot describe it differently. It
  // is two things and only two: a gentler pacing band, and a shorter gap
  // between prompts. It does not touch the measured zone or the goal time.
  const soft = useMemo(() => softeningFor(intent, factors), [intent, factors]);

  // Seconds since the gun, read from the wall clock rather than from state, so
  // a caller can stamp a reading at the moment it happened instead of at the
  // moment React last re-rendered.
  const secondsNow = useCallback(() => {
    if (!startedAtRef.current) return 0;
    return (Date.now() - startedAtRef.current) / 1000;
  }, []);

  // THE CLOCK.
  useEffect(() => {
    if (!running) return undefined;
    const tick = () => setElapsed((Date.now() - startedAt) / 1000);
    tick();
    const id = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(id);
  }, [running, startedAt]);

  // THE POSITION WATCH. Every accepted fix adds one real haversine leg. A fix
  // with poor accuracy, or one implying a sprint no human runs, is discarded
  // and the total does not move. A refusal is not an error state for the run:
  // the run carries on and the manual tap takes over.
  useEffect(() => {
    if (!running || !supported) return undefined;
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
        setAccuracy(finite(fix.accuracy) ? fix.accuracy : null);
        if (finite(fix.accuracy) && fix.accuracy > WORST_ACCURACY_M) return;

        if (previous) {
          const metres = distanceMeters(previous, fix);
          const seconds = Math.max(0.001, (fix.timestamp - previous.timestamp) / 1000);
          if (metres / seconds <= MAX_SPEED_MS) total += metres;
        }
        previous = fix;
        setFixes((count) => count + 1);
        setGeoError("");
        setGpsKm(total / 1000);
      },
      (error) => {
        // The one sentence a runner needs: why the distance is theirs to tap.
        // Denied and "no fix yet" are different sentences, because only one of
        // them is something the runner can do anything about.
        setGeoError(
          error && error.code === 1
            ? "Location is off, so tap Lap as you pass each kilometre."
            : "No position fix yet, so tap Lap as you pass each kilometre.",
        );
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );

    return () => navigator.geolocation.clearWatch(id);
  }, [running, supported]);

  const manualKm = laps.length * MANUAL_LAP_KM;
  const measuredKm = gpsKm != null ? gpsKm : manualKm;
  const distanceSource = gpsKm != null ? "gps" : laps.length ? "manual" : "none";
  const doneKm = Math.min(distanceKm, measuredKm);
  doneRef.current = doneKm;

  const openingPace = useMemo(
    () => targetPace(distanceKm, goalSeconds),
    [distanceKm, goalSeconds],
  );
  const currentPace = plan ? plan.targetPace : openingPace;

  const finish = useMemo(
    () =>
      plan
        ? projectedFinish(plan.distanceKm, doneKm, elapsed, plan.targetPace)
        : null,
    [plan, doneKm, elapsed],
  );

  const gap = useMemo(
    () => (plan ? gapToSegmentedGhost(plan.segments, elapsed, doneKm) : null),
    [plan, elapsed, doneKm],
  );

  // START. Builds the plan from the goal, clears every measurement from any
  // previous run, and starts the clock. It accepts a whole setup so an arrival
  // from the goal screen applies its four choices and starts in one call,
  // rather than setting four pieces of state and hoping they land first.
  // Returns the plan so a caller can speak the opening pace without waiting
  // for a render.
  const start = useCallback(
    (overrides) => {
      const next = overrides
        ? normaliseSetup(overrides)
        : { distanceKm, goalSeconds, intent, factors };
      const gentler = softeningFor(next.intent, next.factors);
      const made = createPlan({
        distanceKm: next.distanceKm,
        goalSeconds: next.goalSeconds,
        // The gentler band IS the softening. The goal time is untouched.
        intent: gentler.pacedAs,
      });
      if (!made) return null;

      setDistanceKmState(next.distanceKm);
      setGoalSecondsState(next.goalSeconds);
      setIntentState(next.intent);
      setFactorsState(next.factors);

      planRef.current = made;
      setPlan(made);
      setGpsKm(null);
      setAccuracy(null);
      setFixes(0);
      setGeoError("");
      lapsRef.current = [];
      doneRef.current = 0;
      setLaps([]);
      setElapsed(0);
      setEnded(false);
      const now = Date.now();
      startedAtRef.current = now;
      setStartedAt(now);
      return made;
    },
    [distanceKm, goalSeconds, intent, factors],
  );

  // END. Stops the clock and the watch and freezes everything as it stands, so
  // the run can still be read after it is over. reset() is what clears it.
  const end = useCallback(() => {
    if (!startedAtRef.current) return;
    setElapsed((Date.now() - startedAtRef.current) / 1000);
    setEnded(true);
  }, []);

  const reset = useCallback(() => {
    planRef.current = null;
    startedAtRef.current = 0;
    lapsRef.current = [];
    doneRef.current = 0;
    setPlan(null);
    setStartedAt(0);
    setElapsed(0);
    setEnded(false);
    setGpsKm(null);
    setAccuracy(null);
    setFixes(0);
    setGeoError("");
    setLaps([]);
  }, []);

  // THE FALLBACK. One tap is one kilometre passed. It is recorded with the time
  // it happened, so the laps carry real splits rather than just a total, and it
  // is ignored once real fixes are landing: a measurement beats a report.
  const markKilometre = useCallback(() => {
    if (!startedAtRef.current) return null;
    const previous = lapsRef.current;
    const at = (Date.now() - startedAtRef.current) / 1000;
    const lap = {
      km: MANUAL_LAP_KM,
      at,
      index: previous.length + 1,
      totalKm: (previous.length + 1) * MANUAL_LAP_KM,
      // The pace of this kilometre alone, which is a measurement of the
      // runner's own timing and not a model of anything.
      lapPace: at - (previous.length ? previous[previous.length - 1].at : 0),
    };
    const next = [...previous, lap];
    lapsRef.current = next;
    setLaps(next);
    return lap;
  }, []);

  const undoKilometre = useCallback(() => {
    const next = lapsRef.current.slice(0, -1);
    lapsRef.current = next;
    setLaps(next);
  }, []);

  // THE LOOP CLOSING. A zone from the talk test becomes a new ghost pace, once.
  // It returns the entry and the new projection synchronously, because the
  // sentence spoken out loud and the sentence on the plate have to be the same
  // one, and waiting for a render to find out what changed is how they drift.
  const applyZone = useCallback(
    (zone, at) => {
      const current = planRef.current;
      if (!current) return null;
      const seconds = finite(at) ? at : secondsNow();
      const next = applyReading(current, { zone, elapsedSeconds: seconds });
      planRef.current = next;
      setPlan(next);

      const entry = next.readings[0] || null;
      return {
        entry,
        plan: next,
        pace: next.targetPace,
        finish: projectedFinish(
          next.distanceKm,
          Math.min(next.distanceKm, doneRef.current),
          seconds,
          next.targetPace,
        ),
      };
    },
    [secondsNow],
  );

  // The setters refuse to move mid run rather than silently rewriting the goal
  // the ghost is already anchored to.
  const setDistanceKm = useCallback((value) => {
    if (startedAtRef.current) return;
    setDistanceKmState(value);
  }, []);
  const setGoalSeconds = useCallback((value) => {
    if (startedAtRef.current) return;
    setGoalSecondsState(value);
  }, []);
  const setGoalMinutes = useCallback((value) => {
    if (startedAtRef.current) return;
    setGoalSecondsState(value * 60);
  }, []);
  const setIntent = useCallback((value) => {
    if (startedAtRef.current) return;
    setIntentState(value);
  }, []);
  const setFactors = useCallback((value) => {
    if (startedAtRef.current) return;
    setFactorsState(value);
  }, []);

  const lastReading = plan && plan.readings.length ? plan.readings[0] : null;

  return {
    // the goal
    distanceKm,
    goalSeconds,
    goalMinutes: goalSeconds / 60,
    intent,
    intents: INTENTS,
    factors,
    setDistanceKm,
    setGoalSeconds,
    setGoalMinutes,
    setIntent,
    setFactors,

    // what a declared breathing factor changes, and the whole of it
    soft,
    promptEvery: soft.promptEvery,

    // the ghost
    plan,
    openingPace,
    targetPace: currentPace,
    segments: plan ? plan.segments : [],
    history: plan ? plan.readings : [],
    lastReading,
    applyZone,

    // the clock
    running,
    ended,
    finished,
    startedAt,
    elapsed,
    elapsedFraction: elapsedFractionFor(elapsed, goalSeconds),
    secondsNow,
    start,
    end,
    reset,

    // the distance
    doneKm,
    measuredKm,
    distanceSource,
    measured: distanceSource !== "none",
    geolocation: {
      supported,
      fixes,
      accuracy,
      error: geoError,
      // True once the run has been going a while with nothing to show for it,
      // which is the moment the tap stops being a fallback and becomes the
      // instruction.
      quiet: running && gpsKm == null && elapsed > 45,
    },
    laps,
    manualKm,
    markKilometre,
    undoKilometre,

    // what it all means
    finish,
    gap,
    goalDelta: finish ? finish.finishSeconds - goalSeconds : 0,
  };
}
