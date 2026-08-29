// THE RUN SETUP, SHARED BY THE GOAL SCREEN AND THE GHOST
//
// The goal screen writes a setup, the pace screen reads it. This file is the
// only thing that knows the shape of it, so the two screens cannot drift apart
// the way two private copies of one list always eventually do.
//
// Pure data and pure functions, plus localStorage. No React, no timers, no
// network. Nothing in this file, and nothing in this app, sends the setup
// anywhere: it is written to this browser on this phone and read back here.
//
// UNITS. Distance is kilometres, time is seconds, pace is seconds per
// kilometre, matching ghostPacing.js.

import {
  INTENTS,
  bandFor,
  formatClock,
  formatPace,
  targetPace,
} from "./ghostPacing.js";

export const SETUP_KEY = "afterburner.setup.v1";

export const DISTANCE_PRESETS = [
  { km: 5, label: "5 km" },
  { km: 10, label: "10 km" },
  { km: 16.1, label: "10 miles" },
  { km: 21.1, label: "Half" },
];

// Rails on the inputs, so a stuck finger on a stepper cannot produce a plan
// nobody could run. 400 m is a track rep, 60 km is past an ultra leg.
export const DISTANCE_MIN = 0.4;
export const DISTANCE_MAX = 60;
export const DISTANCE_STEP = 0.1;
export const GOAL_MIN_SECONDS = 120;
export const GOAL_MAX_SECONDS = 8 * 3600;
export const GOAL_STEP = 15;

// THE OPTIONAL FIELD.
//
// A short list of things a runner might already know about today, in ordinary
// words. None of it is a diagnosis, a symptom score or a clinical category, and
// none of it is asked about again. Declaring one changes exactly two things,
// both listed in softeningFor below, and nothing else anywhere in the app.
export const BREATHING_FACTORS = [
  { id: "asthma", label: "Asthma", note: "asthma" },
  { id: "cold", label: "A cold", note: "a cold" },
  { id: "hayfever", label: "Hay fever", note: "hay fever" },
  { id: "heat", label: "Heat", note: "the heat" },
  { id: "altitude", label: "Altitude", note: "altitude" },
];

// How often the run asks out loud for a talk test. A softened run is asked more
// often, so a day that turns bad is heard sooner rather than five minutes later.
export const PROMPT_EVERY_NORMAL = 300;
export const PROMPT_EVERY_SOFT = 180;

export const DEFAULT_SETUP = {
  distanceKm: 10,
  goalSeconds: 3000,
  intent: "easy",
  factors: [],
};

const finite = (value) => typeof value === "number" && Number.isFinite(value);
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const round1 = (value) => Math.round(value * 10) / 10;

export function intentLabel(id) {
  const found = INTENTS.find((option) => option.id === id);
  return found ? found.label : "Easy";
}

export function intentBand(id) {
  const found = INTENTS.find((option) => option.id === id);
  return found ? found.band : "zones 1 to 2";
}

// ---------------------------------------------------------------------------
// THE SHAPE
// ---------------------------------------------------------------------------

// Anything read back off a device, or handed between screens, goes through here
// first. A setup from an older version of the app, or from a half written key,
// comes out of this as a runnable one rather than as a crash.
export function normaliseSetup(input) {
  const raw = input && typeof input === "object" ? input : {};

  const distanceKm = finite(raw.distanceKm)
    ? clamp(round1(raw.distanceKm), DISTANCE_MIN, DISTANCE_MAX)
    : DEFAULT_SETUP.distanceKm;

  const goalSeconds = finite(raw.goalSeconds)
    ? clamp(
        Math.round(raw.goalSeconds / GOAL_STEP) * GOAL_STEP,
        GOAL_MIN_SECONDS,
        GOAL_MAX_SECONDS,
      )
    : DEFAULT_SETUP.goalSeconds;

  const intent = INTENTS.some((option) => option.id === raw.intent)
    ? raw.intent
    : DEFAULT_SETUP.intent;

  const wanted = Array.isArray(raw.factors) ? raw.factors : [];
  const factors = BREATHING_FACTORS.filter((factor) =>
    wanted.includes(factor.id),
  ).map((factor) => factor.id);

  return { distanceKm, goalSeconds, intent, factors };
}

export function loadSetup() {
  if (typeof window === "undefined" || !window.localStorage) {
    return { ...DEFAULT_SETUP };
  }
  try {
    const raw = window.localStorage.getItem(SETUP_KEY);
    if (!raw) return { ...DEFAULT_SETUP };
    return normaliseSetup(JSON.parse(raw));
  } catch {
    // A browser with storage switched off is not a reason to refuse to run.
    return { ...DEFAULT_SETUP };
  }
}

// Returns the setup it actually stored, normalised, so a caller never has to
// guess whether its own numbers survived the rails.
export function saveSetup(setup) {
  const clean = normaliseSetup(setup);
  if (typeof window === "undefined" || !window.localStorage) return clean;
  try {
    window.localStorage.setItem(SETUP_KEY, JSON.stringify(clean));
  } catch {
    // Private browsing, a full quota, or storage refused outright. The run
    // still works, it just will not be remembered for next time.
  }
  return clean;
}

// ---------------------------------------------------------------------------
// THE SOFTENING, AND EXACTLY WHAT IT IS
// ---------------------------------------------------------------------------

// One step down the pacing ladder. Easy is already the gentlest thing the ghost
// knows, so it stays where it is rather than inventing a sixth band.
const GENTLER = {
  intervals: "race",
  race: "threshold",
  threshold: "long",
  long: "easy",
  easy: "easy",
};

// What a declared factor does, and the whole of what it does:
//
//   1. The ghost paces the run one band gentler, using the bands that already
//      exist in ghostPacing.js. No new arithmetic and no new constant, so the
//      bounds and the monotonicity the pacing already had are the bounds and
//      the monotonicity it still has.
//   2. The run asks for a talk test every three minutes instead of five.
//
// WHAT THE GENTLER BAND IS WORTH depends on which pair of bands it is, so the
// screen does not claim one sentence for all five. Measured off ZONE_BANDS:
// intervals to race and long to easy both ease a zone sooner AND push less;
// race to threshold eases a zone sooner and pushes the same; threshold to long
// eases at the same zone and pushes less; easy has nothing gentler below it and
// only the prompt interval changes. bandEffect below reads that off the bands
// rather than asserting it, so the copy cannot drift from the arithmetic.
//
// It does NOT change the measured zone, it does not change your goal time, and
// it is not a diagnosis of anything.
export function softeningFor(intent, factors) {
  const known = BREATHING_FACTORS.filter((factor) =>
    Array.isArray(factors) ? factors.includes(factor.id) : false,
  );
  const on = known.length > 0;
  const chosen = INTENTS.some((option) => option.id === intent) ? intent : "easy";
  const pacedAs = on ? GENTLER[chosen] || chosen : chosen;

  return {
    on,
    factors: known.map((factor) => factor.id),
    notes: known.map((factor) => factor.note),
    intent: chosen,
    pacedAs,
    bandChanged: pacedAs !== chosen,
    promptEvery: on ? PROMPT_EVERY_SOFT : PROMPT_EVERY_NORMAL,
  };
}

// What one step down the ladder is actually worth, read off the bands rather
// than assumed. A lower top of the band means the ghost starts easing at a
// lower zone. A lower bottom means a middling reading stops counting as room
// to push.
export function bandEffect(intent, pacedAs) {
  const from = bandFor(intent);
  const to = bandFor(pacedAs);
  const easesSooner = to.hi < from.hi;
  const pushesLess = to.lo < from.lo;

  if (easesSooner && pushesLess) {
    return "it starts easing a zone sooner and it stops counting a middling reading as room to push";
  }
  if (easesSooner) return "it starts easing a zone sooner";
  if (pushesLess) return "it stops counting a middling reading as room to push";
  return "the zones it eases and pushes at do not move";
}

export function joinNotes(notes) {
  if (!notes || !notes.length) return "";
  if (notes.length === 1) return notes[0];
  return notes.slice(0, -1).join(", ") + " and " + notes[notes.length - 1];
}

const minutesOf = (seconds) => Math.round(seconds / 60);

// "an easy run", "a long run". Every label in INTENTS is an ordinary English
// word, so the first letter settles it.
const article = (word) =>
  /^[aeiou]/i.test(word) ? "an " + word : "a " + word;

// One sentence, written once, so the goal screen and the run screen describe
// the same behaviour in the same words.
export function describeSoftening(soft) {
  if (!soft) return "";

  const asks =
    " It asks for a talk test about every " +
    minutesOf(PROMPT_EVERY_SOFT) +
    " minutes instead of " +
    minutesOf(PROMPT_EVERY_NORMAL) +
    ".";

  if (!soft.on) {
    return (
      "Nothing declared. The ghost paces this as " +
      article(intentLabel(soft.intent).toLowerCase()) +
      " run and asks for a talk test about every " +
      minutesOf(PROMPT_EVERY_NORMAL) +
      " minutes."
    );
  }

  if (!soft.bandChanged) {
    return (
      "You told us about " +
      joinNotes(soft.notes) +
      ". " +
      intentLabel(soft.intent) +
      " is already the gentlest band the ghost has, so the pacing itself does not change." +
      asks
    );
  }

  return (
    "You told us about " +
    joinNotes(soft.notes) +
    ", so the ghost paces this as " +
    article(intentLabel(soft.pacedAs).toLowerCase()) +
    " run rather than " +
    article(intentLabel(soft.intent).toLowerCase()) +
    " one: " +
    bandEffect(soft.intent, soft.pacedAs) +
    "." +
    asks
  );
}

// The more cautious wording, used on the run screen and spoken in the same
// words. It is a running instruction and nothing more: it names no condition,
// no cause and no remedy.
export function cautionFor(soft, zoneId) {
  if (!soft || !soft.on || !finite(zoneId) || zoneId < 4) return "";
  return " You told us about your breathing today, so take it down and stop if you need to.";
}

// ---------------------------------------------------------------------------
// THE HANDOFF
// ---------------------------------------------------------------------------

// In memory on purpose, and never in storage. A run begins because somebody
// pressed a button one screen ago, so reloading the pace screen, or opening it
// from a link, must never quietly start a clock and a microphone prompt.
let pendingStart = null;

export function requestStart(setup) {
  pendingStart = normaliseSetup(setup);
  return pendingStart;
}

export function takePendingStart() {
  const waiting = pendingStart;
  pendingStart = null;
  return waiting;
}

export function clearPendingStart() {
  pendingStart = null;
}

// ---------------------------------------------------------------------------
// READING IT BACK OUT
// ---------------------------------------------------------------------------

export function openingPaceFor(setup) {
  const clean = normaliseSetup(setup);
  return targetPace(clean.distanceKm, clean.goalSeconds);
}

// The goal implies a pace. The ghost has rails. When the two disagree the
// screen says so out loud rather than showing a pace the ghost will not run.
export function railNote(setup) {
  const clean = normaliseSetup(setup);
  const implied = clean.goalSeconds / clean.distanceKm;
  const paced = openingPaceFor(clean);
  if (paced == null || Math.abs(paced - implied) < 0.5) return "";
  return (
    "That goal works out at " +
    formatPace(implied) +
    " per km, which is outside what the ghost will run. It opens on " +
    formatPace(paced) +
    " instead."
  );
}

export function summaryLine(setup) {
  const clean = normaliseSetup(setup);
  const paced = openingPaceFor(clean);
  return (
    clean.distanceKm.toFixed(1) +
    " km in " +
    formatClock(clean.goalSeconds) +
    ", " +
    intentLabel(clean.intent).toLowerCase() +
    ". Ghost opens on " +
    (paced == null ? "no pace" : formatPace(paced)) +
    " per km."
  );
}
