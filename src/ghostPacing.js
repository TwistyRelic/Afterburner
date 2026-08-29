// THE ADAPTIVE GHOST
//
// A normal ghost runner holds the pace you typed in. This one listens. Every
// talk test reading (see breath.js) returns a zone, 1 to 5, and the zone moves
// the ghost: too hard for what today is meant to be and the ghost eases and
// tells you the honest new finish time; comfortable late in the run and the
// ghost takes some of that back.
//
// Everything here is a pure function of its arguments. No timers, no state, no
// microphone, no DOM. The screen owns the clock; this file owns the arithmetic.
//
// UNITS. Pace is SECONDS PER KILOMETRE throughout, matching ghost.js. Distance
// is kilometres. Time is seconds. Nothing in this file is in minutes.
//
// WHAT IS MEASURED AND WHAT IS ASSUMED. The zone comes from a real measurement
// of your speech. Everything that turns a zone into a number of seconds is a
// CALIBRATION CHOICE, marked ASSUMPTION below. None of it is a laboratory
// value, none of it is lactate or VO2, and none of it is clinical. It is the
// talk test, driving a pacer.

// ---------------------------------------------------------------------------
// RAILS
// ---------------------------------------------------------------------------

// Sanity rails on any pace this module hands back, so a typo in a goal time
// cannot produce a ghost running at 40 s/km. 150 s/km is 2:30/km, faster than
// any distance world record pace. 900 s/km is 15:00/km, slower than a walk.
export const PACE_FLOOR = 150;
export const PACE_CEILING = 900;

// ASSUMPTION A6: a change of gear scales with how fast you already run. A 3:30
// runner and a 7:00 runner do not shift by the same number of seconds, so every
// correction below is a PERCENTAGE of current pace, with an absolute second cap
// on top as a backstop.

// ASSUMPTION A3, the single most important number here. One zone of error is
// worth 3.5% of current pace. It comes from the common training guideline that
// easy pace sits roughly 20 to 25% slower than threshold pace. On this zone map
// that gap is about 1.5 zone steps, so one zone step is roughly 13% of pace,
// and we apply about a quarter of that per reading because a reading is a 12
// second sample and not a verdict. If real data ever contradicts this number,
// THIS is the constant to change.
export const ZONE_STEP = 0.035;

// ASSUMPTION A5, a product judgement rather than physiology: easing wrongly
// costs you a slower run, pushing wrongly costs you the run. So the ghost may
// ease about three times faster than it may push.
export const MAX_EASE_FRACTION = 0.09;
export const MAX_EASE_SECONDS = 22;
export const MAX_PUSH_FRACTION = 0.03;
export const MAX_PUSH_SECONDS = 8;

// ASSUMPTION A4: the first third of a run lies to you. You are fresh, nothing
// has drifted yet and heat has not built. So a comfortable reading does not buy
// a faster ghost until 35% of the planned time has gone, and only buys the full
// amount from 70%. Easing is NEVER gated: if you are coming apart at minute
// three, minute three is when to hear about it.
export const PUSH_OPENS_AT = 0.35;
export const PUSH_FULL_AT = 0.7;

// The cumulative rails, measured against the pace the goal implied at the start
// and not against the last reading. Without these, ten readings of 22 s/km each
// would drift the ghost by more than three minutes per kilometre.
export const TOTAL_SLOWER = 0.3;
export const TOTAL_FASTER = 0.06;

// ASSUMPTION A2, a coaching convention and not a measurement: what zone each
// kind of session is supposed to sit in. lo and hi are inclusive.
export const ZONE_BANDS = {
  easy: { lo: 1, hi: 2 },
  long: { lo: 2, hi: 3 },
  threshold: { lo: 3, hi: 3 },
  race: { lo: 3, hi: 4 },
  intervals: { lo: 4, hi: 5 },
};

export const INTENTS = [
  { id: "easy", label: "Easy", band: "zones 1 to 2" },
  { id: "long", label: "Long", band: "zones 2 to 3" },
  { id: "threshold", label: "Threshold", band: "zone 3" },
  { id: "race", label: "Race", band: "zones 3 to 4" },
  { id: "intervals", label: "Intervals", band: "zones 4 to 5" },
];

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const finite = (value) => typeof value === "number" && Number.isFinite(value);

export const clampPace = (pace) =>
  finite(pace) ? clamp(pace, PACE_FLOOR, PACE_CEILING) : null;

export const bandFor = (intent) => ZONE_BANDS[intent] || ZONE_BANDS.easy;

// ---------------------------------------------------------------------------
// 1. THE OPENING PACE
// ---------------------------------------------------------------------------

// targetPace(10, 3000) is 300, which is 5:00/km for a 50 minute 10 km.
export function targetPace(distanceKm, goalSeconds) {
  if (!finite(distanceKm) || !finite(goalSeconds)) return null;
  if (distanceKm <= 0 || goalSeconds <= 0) return null;
  return clampPace(goalSeconds / distanceKm);
}

// ---------------------------------------------------------------------------
// 2. THE ADJUSTMENT
// ---------------------------------------------------------------------------

// How far outside the band this reading sits. Positive means working harder
// than today was meant to be, negative means there is room. Zero inside the
// band is a deadband: inside your own band the ghost does not twitch.
export function zoneError(zoneId, intent) {
  if (!finite(zoneId)) return 0;
  const band = bandFor(intent);
  if (zoneId > band.hi) return zoneId - band.hi;
  if (zoneId < band.lo) return zoneId - band.lo;
  return 0;
}

// 0 before 35% of the planned time, ramping linearly to 1 at 70%, then 1.
export function pushAllowance(elapsedFraction) {
  if (!finite(elapsedFraction)) return 0;
  const span = PUSH_FULL_AT - PUSH_OPENS_AT;
  return clamp((elapsedFraction - PUSH_OPENS_AT) / span, 0, 1);
}

// The new target pace after one talk test reading.
//
// currentTargetPace    seconds per km the ghost is running now
// zone                 a ZONES entry from breath.js, or its id 1 to 5, or null
// intent               easy | long | threshold | race | intervals
// elapsedFraction      elapsed time over planned time, 0 to 1
// options.openingPace  the pace the goal implied at the start. Supplying it
//                      turns on the cumulative rails and lets the ghost recover
//                      toward the goal, never past it.
//
// MONOTONIC by construction: hold intent and elapsedFraction fixed and the
// returned pace is non-decreasing in zone, because zoneError is non-decreasing
// in zone and every step after it (multiply by a positive, min, max, clamp) is
// non-decreasing. A harder reading can never make the ghost faster.
//
// BOUNDED in three places: the per reading percentage cap, the per reading
// absolute cap in seconds, and the cumulative rails against the opening pace.
export function adjust(currentTargetPace, zone, intent, elapsedFraction, options = {}) {
  const from = clampPace(currentTargetPace);
  const zoneId = finite(zone) ? zone : zone && finite(zone.id) ? zone.id : null;
  const openingPace = clampPace(options.openingPace);
  const band = bandFor(intent);

  const hold = (reason) => ({
    pace: from,
    from,
    deltaSeconds: 0,
    direction: "hold",
    zoneId,
    capped: false,
    goalOutOfReach: false,
    recovering: false,
    reason,
  });

  if (from == null) return hold("no pace to adjust");
  if (zoneId == null) return hold("no reading");

  let error = zoneError(zoneId, intent);
  let recovering = false;

  // The recovery push. On an easy run zones 1 and 2 are both inside the band,
  // so there is no error to correct, yet if the ghost was eased earlier and you
  // have come back to yourself, holding the eased pace to the end is not honest
  // either. This walks the ghost back toward the pace the goal implied and
  // stops there. It can never turn an easy run into a hard one.
  if (
    error === 0 &&
    openingPace != null &&
    zoneId <= band.lo &&
    from > openingPace + 0.5
  ) {
    error = -1;
    recovering = true;
  }

  if (error === 0) return hold("inside the band for this session");

  // The two per reading caps, computed once so the final clamp below can use
  // them again. They are the hard guarantee: whatever the rails, the recovery
  // or a garbage input pace do, ONE reading can never move the ghost further
  // than easeCap slower or pushCap faster.
  const easeCap = Math.min(MAX_EASE_FRACTION * from, MAX_EASE_SECONDS);
  const pushCap = Math.min(MAX_PUSH_FRACTION * from, MAX_PUSH_SECONDS);

  let delta;
  let capped = false;

  if (error > 0) {
    const raw = error * ZONE_STEP * from;
    capped = raw > easeCap;
    delta = Math.min(raw, easeCap);
  } else {
    const allowance = pushAllowance(elapsedFraction);
    if (allowance <= 0) {
      return hold("too early in the run to trust a comfortable reading");
    }
    const raw = error * ZONE_STEP * from * allowance;
    capped = raw < -pushCap;
    delta = Math.max(raw, -pushCap);
  }

  let next = from + delta;
  let goalOutOfReach = false;

  if (openingPace != null) {
    // Recovery stops at the goal pace. A correction push may go a little past
    // it, because a genuinely conservative goal deserves some credit.
    const floorPace = recovering ? openingPace : openingPace * (1 - TOTAL_FASTER);
    const ceilPace = openingPace * (1 + TOTAL_SLOWER);
    if (next > ceilPace) {
      next = ceilPace;
      // The rail is holding a reading that wanted to ease further. That is not
      // the ghost saying you are fine, it is the ghost saying the goal has gone.
      goalOutOfReach = error > 0;
      capped = true;
    }
    if (next < floorPace) {
      next = floorPace;
      capped = true;
    }
  }

  // The per reading cap wins over everything, including the cumulative rails.
  // A pace that starts outside the rails walks back inside over several
  // readings instead of teleporting on one. Clamping to a fixed window around
  // `from` preserves monotonicity, because clamp is monotone in its input.
  next = clamp(next, from - pushCap, from + easeCap);
  next = clampPace(next);
  const deltaSeconds = next - from;
  const direction =
    deltaSeconds > 0.05 ? "ease" : deltaSeconds < -0.05 ? "push" : "hold";

  let reason = "held at the rail";
  if (direction === "ease") reason = "above the band for this session";
  if (direction === "push") {
    reason = recovering
      ? "back inside the band, taking back some of the earlier ease"
      : "under the band with time gone by";
  }

  return {
    pace: next,
    from,
    deltaSeconds,
    direction,
    zoneId,
    capped,
    goalOutOfReach,
    recovering,
    reason,
  };
}

// The numbers the copy quotes, worked at 300 s/km, so nothing on screen is a
// guess about its own algorithm.
export const BOUNDS = {
  referencePace: 300,
  easePerZone: ZONE_STEP * 300,
  maxEase: Math.min(MAX_EASE_FRACTION * 300, MAX_EASE_SECONDS),
  maxPush: Math.min(MAX_PUSH_FRACTION * 300, MAX_PUSH_SECONDS),
  slowestGhost: 300 * (1 + TOTAL_SLOWER),
  fastestGhost: 300 * (1 - TOTAL_FASTER),
};

// ---------------------------------------------------------------------------
// 3. THE HONEST FINISH
// ---------------------------------------------------------------------------

// ASSUMPTION A7: this assumes you hold the CURRENT target pace for everything
// that is left. It does not model further fatigue, hills, wind or heat. The
// screen says "if you hold this" out loud rather than presenting it as fate.
export function projectedFinish(distanceKm, doneKm, elapsedSeconds, currentTargetPace) {
  if (!finite(distanceKm) || distanceKm <= 0) return null;
  const done = clamp(finite(doneKm) ? doneKm : 0, 0, distanceKm);
  const elapsed = Math.max(0, finite(elapsedSeconds) ? elapsedSeconds : 0);
  const pace = clampPace(currentTargetPace);
  if (pace == null) return null;

  const remainingKm = Math.max(0, distanceKm - done);
  const remainingSeconds = remainingKm * pace;

  return {
    finishSeconds: elapsed + remainingSeconds,
    remainingKm,
    remainingSeconds,
    elapsedSeconds: elapsed,
    doneKm: done,
    // What you have actually averaged, which is a measurement and not a model.
    averagePaceSoFar: done > 0.05 ? elapsed / done : null,
    finished: remainingKm <= 0,
  };
}

// ---------------------------------------------------------------------------
// 4. THE GAP
// ---------------------------------------------------------------------------

// The constant pace form. Positive is ahead of the ghost.
export function gapToGhost(elapsedSeconds, doneKm, ghostPaceSeconds) {
  const pace = clampPace(ghostPaceSeconds);
  const elapsed = Math.max(0, finite(elapsedSeconds) ? elapsedSeconds : 0);
  const done = Math.max(0, finite(doneKm) ? doneKm : 0);
  if (pace == null) return { metres: 0, seconds: 0, ahead: true, ghostKm: 0 };

  const ghostKm = elapsed / pace;
  const deltaKm = done - ghostKm;

  return {
    metres: Math.round(deltaKm * 1000),
    // Seconds of the ghost's own running that separate you. Ahead by 40 m at
    // 5:00/km is 12 seconds of ghost.
    seconds: Math.round(deltaKm * pace),
    ahead: deltaKm >= 0,
    ghostKm,
  };
}

// The real ghost changes pace, so its distance is piecewise. A segment is
// { fromSeconds, pace } and the list runs in order from { fromSeconds: 0 }.
export function ghostDistanceAt(segments, elapsedSeconds) {
  if (!Array.isArray(segments) || !segments.length) return 0;
  const elapsed = Math.max(0, finite(elapsedSeconds) ? elapsedSeconds : 0);
  let km = 0;

  for (let i = 0; i < segments.length; i += 1) {
    const start = segments[i].fromSeconds;
    if (elapsed <= start) break;
    const nextStart = i + 1 < segments.length ? segments[i + 1].fromSeconds : Infinity;
    const end = Math.min(elapsed, nextStart);
    const pace = clampPace(segments[i].pace);
    if (pace != null && end > start) km += (end - start) / pace;
  }
  return km;
}

// The gap against that piecewise ghost, in the units the screen shows.
export function gapToSegmentedGhost(segments, elapsedSeconds, doneKm) {
  const ghostKm = ghostDistanceAt(segments, elapsedSeconds);
  const done = Math.max(0, finite(doneKm) ? doneKm : 0);
  const deltaKm = done - ghostKm;
  const last = segments && segments.length ? segments[segments.length - 1] : null;
  const pace = clampPace(last ? last.pace : null) || 300;

  return {
    metres: Math.round(deltaKm * 1000),
    seconds: Math.round(deltaKm * pace),
    ahead: deltaKm >= 0,
    ghostKm,
  };
}

// ---------------------------------------------------------------------------
// 5. THE PLAN, as a pure reducer, so the screen holds no arithmetic
// ---------------------------------------------------------------------------

// The push gate asks "has enough time passed for fatigue to show", and twelve
// minutes is twelve minutes whether you covered two kilometres or three. So the
// fraction is TIME over planned time, never distance over distance.
export function elapsedFractionFor(elapsedSeconds, goalSeconds) {
  if (!finite(goalSeconds) || goalSeconds <= 0) return 0;
  return clamp((finite(elapsedSeconds) ? elapsedSeconds : 0) / goalSeconds, 0, 1);
}

export function createPlan({ distanceKm, goalSeconds, intent = "easy" }) {
  const opening = targetPace(distanceKm, goalSeconds);
  if (opening == null) return null;
  return {
    distanceKm,
    goalSeconds,
    intent,
    openingPace: opening,
    targetPace: opening,
    segments: [{ fromSeconds: 0, pace: opening }],
    readings: [],
  };
}

// Returns a NEW plan. Never mutates the one it was given.
export function applyReading(plan, { zone, elapsedSeconds }) {
  if (!plan) return plan;
  const fraction = elapsedFractionFor(elapsedSeconds, plan.goalSeconds);
  const move = adjust(plan.targetPace, zone, plan.intent, fraction, {
    openingPace: plan.openingPace,
  });

  const entry = {
    at: Math.max(0, finite(elapsedSeconds) ? elapsedSeconds : 0),
    zoneId: move.zoneId,
    fromPace: move.from,
    toPace: move.pace,
    deltaSeconds: move.deltaSeconds,
    direction: move.direction,
    capped: move.capped,
    goalOutOfReach: move.goalOutOfReach,
    reason: move.reason,
  };

  const segments =
    move.direction === "hold"
      ? plan.segments
      : [...plan.segments, { fromSeconds: entry.at, pace: move.pace }];

  return {
    ...plan,
    targetPace: move.pace,
    segments,
    readings: [entry, ...plan.readings].slice(0, 24),
  };
}

// ---------------------------------------------------------------------------
// 6. FORMATTING
// ---------------------------------------------------------------------------

export function formatPace(seconds) {
  if (!finite(seconds)) return "0:00";
  const whole = Math.round(seconds);
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return m + ":" + String(s).padStart(2, "0");
}

export function formatClock(seconds) {
  if (!finite(seconds)) return "0:00";
  const whole = Math.max(0, Math.round(seconds));
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = whole % 60;
  if (h > 0) {
    return h + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }
  return m + ":" + String(s).padStart(2, "0");
}

export function formatDelta(seconds) {
  if (!finite(seconds) || Math.abs(seconds) < 1) return "no change";
  const rounded = Math.round(Math.abs(seconds));
  return seconds > 0 ? rounded + " s/km slower" : rounded + " s/km faster";
}

// One sentence for the plate and for the voice, in the same words, so what you
// hear and what you read cannot drift apart.
export function describeReading(entry, projectedSeconds) {
  if (!entry) return "";
  const tail = finite(projectedSeconds)
    ? " Finish about " + formatClock(projectedSeconds) + " if you hold it."
    : "";

  if (entry.goalOutOfReach) {
    return (
      "Zone " + entry.zoneId +
      ". The ghost is as slow as it goes, so the goal time has gone. Run the rest by feel." +
      tail
    );
  }
  if (entry.direction === "ease") {
    return (
      "Zone " + entry.zoneId + ". Easing the ghost to " +
      formatPace(entry.toPace) + " per km." + tail
    );
  }
  if (entry.direction === "push") {
    return (
      "Zone " + entry.zoneId + ". You have room, so the ghost goes to " +
      formatPace(entry.toPace) + " per km." + tail
    );
  }
  return (
    "Zone " + entry.zoneId + ". That is where this session should be, so the ghost holds " +
    formatPace(entry.toPace) + " per km." + tail
  );
}
