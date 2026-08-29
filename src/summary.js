// Every number any page prints about a run comes through here.
//
// This module exists because the five builds disagreed about the product's own
// rule: three pages each wrote their own "flagged kilometre" test, with a
// different threshold in each, while the app itself ships detectDecoupling().
// The rule has one home, decoupling.js, and is not restated here. This file
// only reads it, formats it, and hands the same answer to every screen.

import {
  BASELINE_KM,
  CADENCE_DROP_SPM,
  PACE_SLIP_SECONDS,
  detectDecoupling,
} from "./decoupling.js";
import {
  cumulativeSeconds,
  ghostPace,
  secondsBehind,
  totalSeconds,
} from "./ghost.js";

export { BASELINE_KM, CADENCE_DROP_SPM, PACE_SLIP_SECONDS };

// The rule in the words the code actually implements, assembled from the same
// constants the detector reads, so the sentence cannot drift from the maths.
export const RULE =
  "A kilometre is flagged when it comes in more than " +
  PACE_SLIP_SECONDS +
  " seconds a kilometre slower than the " +
  BASELINE_KM +
  " before it while the effort called out loud did not go up. When the cadence has fallen away by more than " +
  CADENCE_DROP_SPM +
  " steps a minute as well, it is marked form collapse.";

// Number(null) is 0 and Number("") is 0, so a plain isFinite check reads a
// kilometre with no pace as the fastest in the run and one with no effort as
// the easiest. Both are claims about data that was never captured, so absence
// is carried through as null and drawn as absence.
function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function cleanSplits(splits) {
  if (!Array.isArray(splits)) return [];
  return splits
    .filter((split) => split && toNumber(split.pace) !== null)
    .map((split, index) => {
      const km = toNumber(split.km);
      return {
        km: km === null ? index + 1 : km,
        pace: toNumber(split.pace),
        effort: toNumber(split.effort),
        cadence: toNumber(split.cadence),
        said: typeof split.said === "string" ? split.said : null,
      };
    });
}

export function paceLabel(seconds) {
  const whole = Math.max(0, Math.round(Number(seconds) || 0));
  return Math.floor(whole / 60) + ":" + String(whole % 60).padStart(2, "0");
}

export function plural(count, one, many) {
  return count + " " + (count === 1 ? one : many);
}

// A run gives away minutes, not four figure second counts. Past two minutes it
// reads as minutes and seconds, exactly, with nothing rounded away.
export function spanLabel(seconds) {
  const whole = Math.abs(Math.round(Number(seconds) || 0));
  if (whole < 120) return plural(whole, "second", "seconds");
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  if (!rest) return plural(minutes, "minute", "minutes");
  return (
    plural(minutes, "minute", "minutes") +
    " and " +
    plural(rest, "second", "seconds")
  );
}

export function listKms(kms) {
  if (!kms.length) return "";
  if (kms.length === 1) return "km " + kms[0];
  return "km " + kms.slice(0, -1).join(", ") + " and " + kms[kms.length - 1];
}

export const EASY_HEX = "#3AA0FF"; // effort 1, called easy
export const HARD_HEX = "#FF4D2D"; // effort 10, called maximal
export const UNKNOWN_HEX = "#8D9AA7"; // no effort was called on this kilometre

const EASY_RGB = [58, 160, 255];
const HARD_RGB = [255, 77, 45];

export function effortMix(effort) {
  const numeric = toNumber(effort);
  if (numeric === null) return null;
  return (Math.min(10, Math.max(1, numeric)) - 1) / 9;
}

export function effortHex(effort) {
  const mix = effortMix(effort);
  if (mix === null) return UNKNOWN_HEX;
  const pair = (index) =>
    Math.round(EASY_RGB[index] + (HARD_RGB[index] - EASY_RGB[index]) * mix)
      .toString(16)
      .padStart(2, "0");
  return ("#" + pair(0) + pair(1) + pair(2)).toUpperCase();
}

// Heights are relative to this run, not to any outside standard: 0 is the
// fastest kilometre in it and 1 is the slowest. The exact seconds live in the
// readout beside the shape, which is where a number belongs.
export function heightsFor(rows) {
  if (!rows.length) return { fastest: 0, slowest: 0, spread: 0, norm: [] };
  const paces = rows.map((row) => row.pace);
  const fastest = Math.min(...paces);
  const slowest = Math.max(...paces);
  const spread = slowest - fastest;
  return {
    fastest,
    slowest,
    spread,
    norm: paces.map((pace) => (spread > 0 ? (pace - fastest) / spread : 0)),
  };
}

export function flagsFor(splits) {
  const rows = cleanSplits(splits);
  if (rows.length < 2) return [];
  return detectDecoupling(rows);
}

// How far behind the ghost of the runner's own first kilometre they finished.
export function ghostGap(rows) {
  if (rows.length < 2) return 0;
  const marks = cumulativeSeconds(rows);
  return secondsBehind(totalSeconds(marks), marks, ghostPace(rows));
}

// How closely the effort called out loud moved with the pace actually run,
// 0 to 100. It is a reading of calibration across one session and nothing
// else. Under three kilometres, or with no variation to read, it returns null
// rather than a number built on nothing.
export function calibration(rows) {
  if (rows.length < 3) return null;
  const usable = rows.filter((row) => row.effort !== null);
  if (usable.length < 3) return null;
  const mean = (values) =>
    values.reduce((total, value) => total + value, 0) / values.length;
  const meanPace = mean(usable.map((row) => row.pace));
  const meanEffort = mean(usable.map((row) => row.effort));
  let covariance = 0;
  let paceVariance = 0;
  let effortVariance = 0;
  usable.forEach((row) => {
    covariance += (row.pace - meanPace) * (row.effort - meanEffort);
    paceVariance += (row.pace - meanPace) ** 2;
    effortVariance += (row.effort - meanEffort) ** 2;
  });
  if (!paceVariance || !effortVariance) return null;
  const r = covariance / Math.sqrt(paceVariance * effortVariance);
  return Math.round(((r + 1) / 2) * 100);
}

export function summarise(splits) {
  const rows = cleanSplits(splits);
  const flags = flagsFor(rows);
  const heights = heightsFor(rows);
  return {
    rows,
    kms: rows.length,
    flags,
    count: flags.length,
    flagged: new Set(flags.map((flag) => flag.km)),
    flagList: listKms(flags.map((flag) => flag.km)),
    collapse: flags.find((flag) => flag.kind === "form-collapse") || null,
    first: rows[0] || null,
    last: rows.length ? rows[rows.length - 1] : null,
    fastest: heights.fastest,
    slowest: heights.slowest,
    behind: ghostGap(rows),
    score: calibration(rows),
  };
}

// A canvas says nothing to a screen reader, so both ribbon renderers publish
// this, and the data survives when neither of them can draw.
export function describe(rows, flagged) {
  if (!rows.length) return "";
  const head =
    "Pace and reported effort, one bar for each of " +
    rows.length +
    " kilometres. A taller bar is a slower kilometre, blue is an effort called easy, orange is an effort called hard.";
  const body = rows
    .map((row) => {
      const effort =
        row.effort === null
          ? "no effort called"
          : "effort " + row.effort + " out of 10";
      return (
        "Kilometre " +
        row.km +
        ", " +
        paceLabel(row.pace) +
        " per kilometre, " +
        effort +
        (flagged.has(row.km) ? ", flagged." : ".")
      );
    })
    .join(" ");
  return head + " " + body;
}
