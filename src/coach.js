import { CADENCE_DROP_SPM, detectDecoupling } from "./decoupling.js";

// What the rule read on this session, in words, with the numbers it read under
// it. Every line is picked by a threshold and no language model is involved
// anywhere in this path.
//
// It used to end each card with a training instruction: cut intensity
// tomorrow, cap at zone 2 for forty minutes, add a rep next week. Afterburner
// measures what you said against what you did. It does not prescribe training
// to an individual, so those lines are gone and what is left describes the
// kilometre rather than telling you what to do about it.

const pace = (seconds) =>
  Math.floor(seconds / 60) +
  ":" +
  String(Math.round(seconds % 60)).padStart(2, "0");

const drop = (delta) =>
  (delta > 0 ? "down " : "up ") + Math.abs(Math.round(delta)) + " spm";

export function coachReply(session) {
  const splits = session.splits;
  if (!splits || !splits.length) return null;

  const flags = detectDecoupling(splits);
  const flag = flags.find((item) => item.kind === "form-collapse") || flags[0];
  const cadenceDelta = splits[0].cadence - splits[splits.length - 1].cadence;

  if (!flag) {
    const last = splits[splits.length - 1];
    return {
      text:
        cadenceDelta > CADENCE_DROP_SPM
          ? "No kilometre was flagged. Cadence faded across the session without the pace going with it."
          : "No kilometre was flagged. Nothing came apart against what was reported.",
      sources: [
        { label: "Km", value: String(last.km) },
        { label: "Split", value: last.pace + " s · " + pace(last.pace) + "/km" },
        { label: "Reported effort", value: last.effort + "/10" },
        { label: "Cadence across the run", value: drop(cadenceDelta) },
      ],
    };
  }

  const split = splits.find((item) => item.km === flag.km);
  return {
    text:
      flag.kind === "form-collapse"
        ? "Km " +
          flag.km +
          " ran " +
          flag.paceSlip +
          " seconds a kilometre slower than the kilometres before it while the reported effort held, and the cadence fell away on the same kilometre. The form went before the effort did."
        : "Km " +
          flag.km +
          " ran " +
          flag.paceSlip +
          " seconds a kilometre slower than the kilometres before it while the reported effort held.",
    sources: [
      { label: "Km", value: String(flag.km) },
      { label: "Split", value: split.pace + " s · " + pace(split.pace) + "/km" },
      { label: "Reported effort", value: split.effort + "/10" },
      { label: "Cadence on that km", value: drop(flag.cadenceDrop) },
      { label: "Slower than baseline", value: flag.paceSlip + " s/km" },
    ],
  };
}
