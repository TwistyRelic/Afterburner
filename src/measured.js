// Every number a card shows about a session is computed here from its splits.
// Nothing is written by hand, so there is no figure on screen that cannot be
// traced back to a captured measurement.
export function formatPace(seconds) {
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export function averagePace(splits) {
  return splits.reduce((sum, split) => sum + split.pace, 0) / splits.length;
}

export function measured(splits) {
  if (!splits?.length) return null;
  const first = splits[0];
  const last = splits[splits.length - 1];
  return {
    splits: splits.length,
    average: `${formatPace(averagePace(splits))}/km`,
    cadence:
      first.cadence === last.cadence
        ? `${first.cadence} spm`
        : `${first.cadence} → ${last.cadence} spm`,
  };
}
