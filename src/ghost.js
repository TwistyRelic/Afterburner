// The ghost is the runner's own first kilometre, held for the whole run. It is
// the fairest possible opponent: it never gets tired, and it is not a stranger's
// pace — it is the pace the runner set when they still felt fresh.
export const GHOST_KM = 1;

export function ghostPace(splits) {
  return splits[GHOST_KM - 1].pace;
}

// Elapsed seconds at the end of each kilometre, with a leading 0 so index i is
// the time at distance i km.
export function cumulativeSeconds(splits) {
  const marks = [0];
  splits.forEach((split) => marks.push(marks[marks.length - 1] + split.pace));
  return marks;
}

export function totalSeconds(marks) {
  return marks[marks.length - 1];
}

// Where the real runner is, in kilometres, after `seconds` of running. Pace is
// constant within a kilometre, so the position interpolates linearly inside the
// split that contains `seconds`.
export function distanceAt(seconds, marks) {
  const clamped = Math.max(0, Math.min(seconds, totalSeconds(marks)));
  let km = 0;
  while (km + 1 < marks.length && marks[km + 1] <= clamped) km += 1;
  const span = marks[km + 1] - marks[km];
  if (!span) return km;
  return km + (clamped - marks[km]) / span;
}

export function ghostDistanceAt(seconds, pace) {
  return Math.max(0, seconds) / pace;
}

// The gap the runner cannot feel: how long ago the ghost passed the point they
// are standing on. Zero for the whole first kilometre, then it only grows.
export function secondsBehind(seconds, marks, pace) {
  const km = distanceAt(seconds, marks);
  return Math.max(0, Math.min(seconds, totalSeconds(marks)) - km * pace);
}
