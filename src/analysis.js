// THE BREATHING SCORE AND WHAT TO DO ABOUT IT
//
// Everything here is computed from the four numbers the talk test already
// measures. Nothing is invented, nothing is looked up, and no model is involved.
//
// The techniques are established running coaching, not medical advice: rhythmic
// breathing, nasal breathing at easy pace, and breathing from the diaphragm are
// all standard coaching practice. Nothing here treats a condition or tells
// anyone they are ill.

// CONTROL is how steady the breathing is. A runner in control holds long,
// even phrases; a runner working hard produces short, ragged ones. It is the
// phrase length scaled against the range a person can actually produce, so it
// is comparable between two samples from the same person.
export function controlScore({ phraseLength, pauseRatio }) {
  if (phraseLength == null) return null;
  const length = Math.max(0, Math.min(1, (phraseLength - 0.5) / 3.2));
  const quiet = Math.max(0, Math.min(1, 1 - (pauseRatio - 0.2) / 0.5));
  return Math.round((length * 0.7 + quiet * 0.3) * 100);
}

// EFFICIENCY is how much speech you get per breath taken. Two runners can sit
// in the same zone with very different breathing economy.
export function efficiencyScore({ phraseLength, phraseRate }) {
  if (phraseLength == null || !phraseRate) return null;
  const perBreath = Math.max(0, Math.min(1, phraseLength / 3.5));
  const calm = Math.max(0, Math.min(1, 1 - (phraseRate - 12) / 34));
  return Math.round((perBreath * 0.6 + calm * 0.4) * 100);
}

// A single headline out of 100, so two samples are comparable at a glance.
export function breathingScore(reading) {
  const control = controlScore(reading);
  const efficiency = efficiencyScore(reading);
  if (control == null || efficiency == null) return null;
  return Math.round(control * 0.55 + efficiency * 0.45);
}

export const bandFor = (score) => {
  if (score == null) return { label: "Not enough speech", colour: "#9BA6B5" };
  if (score >= 78) return { label: "Strong", colour: "#4FD1A5" };
  if (score >= 58) return { label: "Solid", colour: "#3AA0FF" };
  if (score >= 38) return { label: "Working", colour: "#F2C14E" };
  return { label: "Ragged", colour: "#FF8A3D" };
};

// Technique, chosen by what the numbers actually say. Each one names the number
// that triggered it, so the advice is traceable rather than generic.
export function techniquesFor(reading, zone) {
  if (!reading || reading.phraseLength == null) return [];
  const out = [];
  const { phraseLength, pauseRatio, phraseRate } = reading;

  if (phraseRate > 30) {
    out.push({
      title: "Slow the rate, not the depth",
      why: `You took about ${phraseRate} breaths a minute in that sample.`,
      how: "Rapid shallow breathing moves less air than it feels like it does. Lengthen the out breath first: the in breath follows it on its own.",
    });
  }

  if (phraseLength < 1.6) {
    out.push({
      title: "Try a three two rhythm",
      why: `You managed about ${phraseLength} seconds of speech between breaths.`,
      how: "Breathe in over three footfalls and out over two. It locks breathing to your stride so it stops drifting, and it alternates which foot you exhale on.",
    });
  }

  if (pauseRatio > 0.5) {
    out.push({
      title: "Breathe from lower down",
      why: `You were silent for about ${Math.round(pauseRatio * 100)} percent of that sample.`,
      how: "Put a hand on your stomach: it should move before your chest does. Chest breathing at pace costs you air you already paid for.",
    });
  }

  if (zone && zone.id <= 2) {
    out.push({
      title: "Hold this and try nasal only",
      why: "You are in a zone where breathing through the nose is realistic.",
      how: "Nose breathing on easy runs is a hard ceiling on how fast you can go, which is exactly what makes it useful for keeping easy days easy.",
    });
  }

  if (zone && zone.id >= 4) {
    out.push({
      title: "Recover the breathing before the pace",
      why: "You are above the point where talking breaks down.",
      how: "Ease until you can get a full sentence out again, then hold there for a minute before deciding anything. Pace follows breathing back, not the other way round.",
    });
  }

  return out.slice(0, 3);
}

// Comparing two readings from the same person, which is where this gets useful.
export function compare(previous, current) {
  if (!previous || !current) return null;
  const before = breathingScore(previous);
  const after = breathingScore(current);
  if (before == null || after == null) return null;
  const delta = after - before;
  return {
    delta,
    before,
    after,
    line:
      delta > 4
        ? `Your breathing is ${delta} points steadier than the last reading.`
        : delta < -4
          ? `Your breathing is ${Math.abs(delta)} points more ragged than the last reading.`
          : "Your breathing is holding about where it was.",
  };
}
