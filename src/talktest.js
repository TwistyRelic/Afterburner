// The talk test: a runner reads one sentence out loud and we time how long the
// speech runs before they have to breathe. It is a long-standing field method in
// exercise physiology for gauging intensity by speech comfort. It is not a
// lactate test, it is not a VO2 max test, and it diagnoses nothing.
export const PHRASE = "I can still hold this pace and finish this sentence.";

// Seconds of speech before the breath, mapped to a 1-5 zone. The boundaries are
// a convention this app applies consistently so readings can be compared to each
// other — they are not a clinical scale.
export const BANDS = [
  { zone: 1, from: 10, label: "Conversational" },
  { zone: 2, from: 7, label: "Comfortable" },
  { zone: 3, from: 5, label: "Sentences shortening" },
  { zone: 4, from: 3, label: "A few words" },
  { zone: 5, from: 0, label: "Single words" },
];

export function zoneFor(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  return BANDS.find((band) => seconds >= band.from) ?? BANDS[BANDS.length - 1];
}

export function bandFor(zone) {
  return BANDS.find((band) => band.zone === zone) ?? null;
}

// The window a zone covers, for showing what the next reading would have to be
// to land somewhere else. The easiest zone is open-ended upwards.
export function bandRange(zone) {
  const index = BANDS.findIndex((band) => band.zone === zone);
  if (index < 0) return null;
  const band = BANDS[index];
  const above = BANDS[index - 1];
  return { from: band.from, to: above ? above.from : null };
}

export function formatSeconds(seconds) {
  return `${seconds.toFixed(1)} s`;
}
