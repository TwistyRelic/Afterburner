// The adaptive ghost. Every pace here is derived from a reading the runner gave
// and a pace the phone measured. With no reading and no fix there is no ghost
// pace, and the screen says so rather than showing a number.

// Pace multipliers relative to zone 3, the pace a runner holds while their
// sentences are just starting to shorten. Higher means slower.
export const FACTOR = { 1: 1.2, 2: 1.1, 3: 1, 4: 0.95, 5: 0.9 };

export function ghostPace(referencePace, referenceZone, targetZone) {
  if (!Number.isFinite(referencePace) || referencePace <= 0) return null;
  const from = FACTOR[referenceZone];
  const to = FACTOR[targetZone];
  if (!from || !to) return null;
  return (referencePace * to) / from;
}

// Positive means the runner is behind the ghost over the distance covered.
export function secondsBehind(runnerPace, pace, km) {
  if (!Number.isFinite(runnerPace) || !Number.isFinite(pace)) return null;
  return Math.round((runnerPace - pace) * km);
}

export function formatPace(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}/km`;
}

export function paceFromSpeed(metresPerSecond) {
  if (!Number.isFinite(metresPerSecond) || metresPerSecond <= 0.4) return null;
  return 1000 / metresPerSecond;
}
