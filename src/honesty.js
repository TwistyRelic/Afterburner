// Honesty is measurable. If a runner reports effort truthfully, reported effort
// and measured seconds-per-km move together: the kilometres that felt harder are
// the kilometres that were slower. Pearson's r over every kilometre of the run
// is exactly that agreement, and the dial is r rescaled to 0-100:
//
//   r =  1  → 100   every reported effort matched the pace
//   r =  0  →  50   what they said carried no information about the run
//   r = -1  →   0   they reported it the other way round entirely
export function correlation(a, b) {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;

  const meanA = a.reduce((sum, value) => sum + value, 0) / n;
  const meanB = b.reduce((sum, value) => sum + value, 0) / n;

  let covariance = 0;
  let varianceA = 0;
  let varianceB = 0;
  for (let index = 0; index < n; index += 1) {
    const da = a[index] - meanA;
    const db = b[index] - meanB;
    covariance += da * db;
    varianceA += da * da;
    varianceB += db * db;
  }

  const spread = Math.sqrt(varianceA * varianceB);
  if (!spread) return 0;
  // Clamped because floating-point error can put a perfect relationship just
  // outside [-1, 1], which would show as a score of -0 or 101.
  return Math.max(-1, Math.min(1, covariance / spread));
}

export function honesty(splits) {
  const r = correlation(
    splits.map((split) => split.effort),
    splits.map((split) => split.pace),
  );
  return {
    r,
    score: Math.round(((r + 1) / 2) * 100),
  };
}
