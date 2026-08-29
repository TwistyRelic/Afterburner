import { CADENCE_DROP_SPM, detectDecoupling } from "./decoupling.js";

// Every reply is computed from the splits by these rules. No language model is
// involved anywhere in this path — the text is picked by a threshold and the
// numbers printed under it are the ones the rule actually read.
const pace = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;

const signed = (delta) =>
  `${delta > 0 ? "−" : "+"}${Math.abs(Math.round(delta))} spm`;

export function coachReply(session) {
  const splits = session.splits;
  if (!splits?.length) return null;

  const flags = detectDecoupling(splits);
  const flag = flags.find((item) => item.kind === "form-collapse") ?? flags[0];
  const cadenceDelta = splits[0].cadence - splits[splits.length - 1].cadence;

  if (!flag) {
    const last = splits[splits.length - 1];
    return {
      text:
        cadenceDelta > CADENCE_DROP_SPM
          ? "Cadence faded without the pace going — hold the volume, add a cadence cue."
          : "Nothing came apart: add one rep next week, same rest.",
      sources: [
        { label: "Km", value: `${last.km}` },
        { label: "Split", value: `${last.pace} s · ${pace(last.pace)}/km` },
        { label: "Reported effort", value: `${last.effort}/10` },
        { label: "Cadence", value: signed(cadenceDelta) },
      ],
    };
  }

  const split = splits.find((item) => item.km === flag.km);
  return {
    text:
      flag.kind === "form-collapse"
        ? `Form went before the effort did — cut intensity tomorrow, 40 min easy at ${splits[0].cadence} spm.`
        : "Pace slipped on a flat report — cap tomorrow at zone 2, 40 minutes.",
    sources: [
      { label: "Km", value: `${flag.km}` },
      { label: "Split", value: `${split.pace} s · ${pace(split.pace)}/km` },
      { label: "Reported effort", value: `${split.effort}/10` },
      { label: "Cadence", value: signed(flag.cadenceDrop) },
      { label: "Slower than baseline", value: `${flag.paceSlip} s/km` },
    ],
  };
}
