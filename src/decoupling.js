// Decoupling: the pace and the cadence come apart while the runner keeps
// reporting the same effort. A slip on its own is just fatigue; a slip with the
// cadence falling away is form collapse, and that is the finding.
export const PACE_SLIP_SECONDS = 8;
export const CADENCE_DROP_SPM = 6;
export const BASELINE_KM = 3;

const mean = (values) =>
  values.reduce((total, value) => total + value, 0) / values.length;

// `cadence: false` is the degraded path: a phone with no DeviceMotion cannot
// measure steps, so the detector reads pace alone and never claims collapse.
export function detectDecoupling(splits, { cadence = true } = {}) {
  const flags = [];

  splits.forEach((split, index) => {
    const previous = splits.slice(Math.max(0, index - BASELINE_KM), index);
    if (!previous.length) return;

    const paceSlip = split.pace - mean(previous.map((item) => item.pace));
    const cadenceDrop =
      mean(previous.map((item) => item.cadence)) - split.cadence;
    // "Reported flat" means they did not call it harder than the kilometres
    // before it — the whole point is that they think nothing changed.
    const reportedFlat =
      split.effort <= Math.max(...previous.map((i) => i.effort));

    if (paceSlip <= PACE_SLIP_SECONDS || !reportedFlat) return;

    flags.push({
      km: split.km,
      kind:
        cadence && cadenceDrop > CADENCE_DROP_SPM ? "form-collapse" : "slowing",
      paceSlip: Math.round(paceSlip),
      cadenceDrop: cadence ? Math.round(cadenceDrop) : null,
      effort: split.effort,
    });
  });

  return flags;
}
