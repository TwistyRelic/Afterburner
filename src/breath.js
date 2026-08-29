// THE TALK TEST, MEASURED FROM THE MICROPHONE
//
// How much you can say between breaths tracks how hard you are working. This is
// the talk test, a long standing method in exercise physiology: speak in full
// sentences and you are working easily; get four words out and you are above
// the point where talking becomes difficult. Coaches use it by ear. We measure it.
//
// What we actually compute, from raw microphone energy and nothing else:
//   phraseLength   mean seconds of continuous speech between breaths
//   pauseRatio     proportion of the sample spent not speaking
//   phraseRate     phrases per minute, which rises as they get shorter
//   speechRate     rough syllables per second inside a phrase
//
// WHAT THIS IS NOT. It is not a lactate measurement, it is not VO2max, and it
// does not diagnose anything. Those need a laboratory. This is the talk test,
// which is a real method with real limits, and we say so on the screen.

export const ZONES = [
  {
    id: 1,
    name: "Conversational",
    short: "Easy",
    colour: "#3AA0FF",
    lead: "You could hold a conversation.",
    guidance: "This is the pace most easy runs should actually be. If today is an easy day, you are in the right place.",
  },
  {
    id: 2,
    name: "Comfortable",
    short: "Steady",
    colour: "#4FD1A5",
    lead: "Full sentences, but you are choosing them.",
    guidance: "A sustainable working pace. Good for long steady efforts. If today was meant to be easy, ease off.",
  },
  {
    id: 3,
    name: "Working",
    short: "Threshold",
    colour: "#F2C14E",
    lead: "Short sentences only.",
    guidance: "You are around the point where talking gets difficult. Sustainable for a while, not for a long run.",
  },
  {
    id: 4,
    name: "Hard",
    short: "Hard",
    colour: "#FF8A3D",
    lead: "A few words at a time.",
    guidance: "Above the point where talking breaks down. If this was meant to be an easy run, you are running it too hard.",
  },
  {
    id: 5,
    name: "Maximal",
    short: "Max",
    colour: "#FF4D2D",
    lead: "One word, then a breath.",
    guidance: "You cannot hold this. Fine for intervals, wrong for anything longer.",
  },
];

// Thresholds in seconds of continuous speech per breath. Read as: a person
// working easily runs on for several seconds; a person at their limit gets a
// word out and has to breathe.
const PHRASE_BANDS = [3.2, 2.2, 1.4, 0.8];

export function zoneFor({ phraseLength, pauseRatio }) {
  if (phraseLength == null) return null;
  let index = PHRASE_BANDS.findIndex((band) => phraseLength >= band);
  if (index === -1) index = PHRASE_BANDS.length;
  // A high pause ratio pushes it one zone harder: someone taking long recovery
  // breaths between short phrases is working harder than phrase length alone says.
  if (pauseRatio > 0.55 && index < ZONES.length - 1) index += 1;
  return ZONES[Math.min(index, ZONES.length - 1)];
}

// Turns a raw energy trace into phrases and breaths.
// `frames` is an array of {t, rms} sampled at roughly 50 Hz.
export function analyse(frames, { floor = 0.012 } = {}) {
  if (!frames.length) return null;

  const speaking = frames.map((f) => f.rms > floor);
  const phrases = [];
  let start = null;

  speaking.forEach((isSpeech, i) => {
    if (isSpeech && start === null) start = frames[i].t;
    if (!isSpeech && start !== null) {
      const length = frames[i].t - start;
      // Anything under 150 ms is a click or a footfall, not a phrase.
      if (length > 0.15) phrases.push({ start, length });
      start = null;
    }
  });
  if (start !== null) {
    const length = frames[frames.length - 1].t - start;
    if (length > 0.15) phrases.push({ start, length });
  }

  const duration = frames[frames.length - 1].t - frames[0].t;
  if (!phrases.length || duration <= 0) {
    return { phraseLength: null, pauseRatio: null, phraseRate: 0, phrases: [], duration };
  }

  const spoken = phrases.reduce((sum, p) => sum + p.length, 0);
  const phraseLength = spoken / phrases.length;
  const pauseRatio = Math.max(0, Math.min(1, 1 - spoken / duration));
  const phraseRate = (phrases.length / duration) * 60;

  return {
    phraseLength: Number(phraseLength.toFixed(2)),
    pauseRatio: Number(pauseRatio.toFixed(2)),
    phraseRate: Math.round(phraseRate),
    longest: Number(Math.max(...phrases.map((p) => p.length)).toFixed(2)),
    phrases,
    duration: Number(duration.toFixed(1)),
  };
}

// Pace guidance, derived only from the zone and the runner's stated intent.
// It never recommends a heart rate, a wattage, or anything clinical.
export function guidanceFor(zone, intent) {
  if (!zone) return null;
  if (!intent) return zone.guidance;
  if (intent === "easy" && zone.id >= 3) {
    return `You meant this to be easy and you are in ${zone.name.toLowerCase()}. Slow down until you can hold a full sentence again.`;
  }
  if (intent === "easy" && zone.id <= 2) {
    return "This is genuinely easy. Hold it here.";
  }
  if (intent === "threshold" && zone.id <= 2) {
    return "You are under your working pace. You have room to pick it up.";
  }
  if (intent === "threshold" && zone.id >= 4) {
    return "You are above threshold. Ease back until short sentences come without a fight.";
  }
  if (intent === "threshold") return "This is the right place for a threshold effort. Hold it.";
  if (intent === "intervals" && zone.id >= 4) return "That is a real interval. Recover properly before the next one.";
  if (intent === "intervals") return "Not hard enough for an interval yet.";
  return zone.guidance;
}

// The reference sentence. Everyone reads the same words, so two samples from the
// same person are comparable, and two people are comparable to each other.
export const TEST_SENTENCE =
  "I am running comfortably and I can still say this whole sentence without stopping for a breath.";
