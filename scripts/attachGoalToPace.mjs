// Re-applies the goal screen handoff to Pace.jsx after a concurrent rewrite of
// that file dropped the first pass. Every replacement asserts one match, so a
// second rewrite fails this script loudly instead of landing half applied.
import { readFileSync, writeFileSync } from "node:fs";

// Paths are relative to the project root, so run this from there:
//   node scripts/attachGoalToPace.mjs
const path = "src/pages/Pace.jsx";
const raw = readFileSync(path, "utf8");

// The file comes back with Windows endings sometimes and Unix endings at others,
// depending on which editor last wrote it. Measured: every single line anchor
// matched while every multi line one found nothing, which is exactly what a
// carriage return does to an anchor written with plain newlines. So match
// against normalised text and write back in whatever style the file had.
const CR = String.fromCharCode(13);
const LF = String.fromCharCode(10);
const crlf = raw.includes(CR + LF);
let src = crlf ? raw.split(CR + LF).join(LF) : raw;

const edits = [
  [
    'import { AnimatePresence, motion } from "framer-motion";',
    'import { Link } from "react-router-dom";\nimport { AnimatePresence, motion } from "framer-motion";',
  ],
  [
    '} from "../ghostPacing.js";',
    '} from "../ghostPacing.js";\nimport {\n  cautionFor,\n  describeSoftening,\n  loadSetup,\n  softeningFor,\n  takePendingStart,\n} from "../runSetup.js";',
  ],
  [
    'const PROMPT_EVERY = 300;',
    '// How often the run asks out loud for the next talk test is read from the\n// setup, because a run that declared something about breathing is asked more\n// often. runSetup.js owns both numbers and both screens read them from there.',
  ],
  [
    '  const [distanceKm, setDistanceKm] = useState(10);\n  const [goalMinutes, setGoalMinutes] = useState(50);\n  const [intent, setIntent] = useState("easy");',
    '  // What the goal screen last wrote, so this screen is not a second private\n  // copy of the same three questions. A pure read, so the strict development\n  // double render cannot make it mean two different things.\n  const saved = useMemo(() => loadSetup(), []);\n  const [distanceKm, setDistanceKm] = useState(saved.distanceKm);\n  const [goalSeconds, setGoalSeconds] = useState(saved.goalSeconds);\n  const [intent, setIntent] = useState(saved.intent);\n  const [factors, setFactors] = useState(saved.factors);',
  ],
  [
    '  const goalSeconds = goalMinutes * 60;\n  const openingPace = goalSeconds / distanceKm;',
    '  const openingPace = goalSeconds / distanceKm;\n\n  // The whole of what a declared breathing factor does: one gentler pacing band,\n  // and a shorter gap between prompts. Both come from runSetup.js so this screen\n  // and the goal screen cannot describe them differently.\n  const soft = useMemo(() => softeningFor(intent, factors), [intent, factors]);\n  const promptEvery = soft.promptEvery;',
  ],
  [
    '      nextPromptRef.current = seconds + PROMPT_EVERY;\n      if (voice) {',
    '      nextPromptRef.current = seconds + promptEvery;\n      if (voice) {',
  ],
  [
    '        speak(verdictFor(next.readings[0], ahead ? ahead.finishSeconds : null));',
    '        speak(\n          verdictFor(next.readings[0], ahead ? ahead.finishSeconds : null) +\n            cautionFor(soft, next.readings[0].zoneId),\n        );',
  ],
  [
    '  }, [breath.result, startedAt, voice]);',
    '  }, [breath.result, startedAt, voice, soft, promptEvery]);',
  ],
  [
    '      nextPromptRef.current = seconds + PROMPT_EVERY;\n      speak("Talk test. Read the sentence.");',
    '      nextPromptRef.current = seconds + promptEvery;\n      speak("Talk test. Read the sentence.");',
  ],
  [
    '  }, [running, armed, voice, startedAt]);',
    '  }, [running, armed, voice, startedAt, promptEvery]);',
  ],
  [
    '  const start = () => {\n    const made = createPlan({ distanceKm, goalSeconds, intent });\n    if (!made) return;',
    '  // ONE start path, used by the button on this screen and by an arrival from\n  // the goal screen, so a run cannot begin two slightly different ways.\n  const startWith = useCallback(\n    (config) => {\n      const gentler = softeningFor(config.intent, config.factors);\n      const made = createPlan({\n        distanceKm: config.distanceKm,\n        goalSeconds: config.goalSeconds,\n        // The gentler band IS the softening. The goal time is untouched.\n        intent: gentler.pacedAs,\n      });\n      if (!made) return;',
  ],
  // The body of the old start function is left exactly as it is, whatever it
  // now contains, so a rewrite of its internals does not break this patch.
  // Only the head, the one line that read breath through a render value, and
  // the tail are touched.
  [
    '    lastSampleRef.current = breath.result ? breath.result.at : null;',
    '    lastSampleRef.current = breathRef.current.result\n      ? breathRef.current.result.at\n      : null;',
  ],
  [
    '  };\n\n  const end = () => {',
    '  },\n    [voice],\n  );\n\n  const start = () => startWith({ distanceKm, goalSeconds, intent, factors });\n\n  // ARRIVING FROM THE GOAL SCREEN. The press that starts a run happened one\n  // screen ago, and the token that carries it lives in memory only, so a reload,\n  // a bookmark or a plain link to this page never starts a clock by itself.\n  useEffect(() => {\n    const pending = takePendingStart();\n    if (!pending) return;\n    setDistanceKm(pending.distanceKm);\n    setGoalSeconds(pending.goalSeconds);\n    setIntent(pending.intent);\n    setFactors(pending.factors);\n    startWith(pending);\n  }, [startWith]);\n\n  const end = () => {',
  ],
  [
    '                onClick={() => setGoalMinutes((m) => Math.min(360, m + 1))}',
    '                onClick={() => setGoalSeconds((s) => Math.min(28800, s + 60))}',
  ],
  [
    '                onClick={() => setGoalMinutes((m) => Math.max(5, m - 1))}',
    '                onClick={() => setGoalSeconds((s) => Math.max(120, s - 60))}',
  ],
  [
    '                {goalMinutes}:00',
    '                {formatClock(goalSeconds)}',
  ],
  [
    '  const verdictText = verdictFor(lastReading, finishSeconds);',
    '  const verdictText =\n    verdictFor(lastReading, finishSeconds) +\n    cautionFor(soft, lastReading ? lastReading.zoneId : null);',
  ],
  [
    '                <span className="abp-ghostLabel">Ghost</span>',
    '                <span className="abp-ghostLabel">\n                  {soft.on ? "Ghost, gentle" : "Ghost"}\n                </span>',
  ],
  [
    '          Ask me out loud, about every {Math.round(PROMPT_EVERY / 60)} minutes',
    '          Ask me out loud, about every {Math.round(promptEvery / 60)} minutes',
  ],
  [
    '        any condition, including asthma, and it does not replace a clinician.\n      </p>',
    '        any condition, including asthma, and it does not replace a clinician.\n        {soft.on ? " " + describeSoftening(soft) : ""}\n      </p>',
  ],
  [
    '            diagnose or treat anything, including asthma, and it does not replace a\n            clinician.\n          </p>',
    '            diagnose or treat anything, including asthma, and it does not replace a\n            clinician.\n          </p>\n\n          <Link className="abp-goalLink" to="/goal">\n            Set the run up on the goal screen\n          </Link>',
  ],
  [
    '.abp-sr {',
    '.abp-goalLink {\n  display: block;\n  min-height: 44px;\n  padding: 11px 0;\n  color: #9BA6B5;\n  font-size: 16px;\n}\n\n.abp-sr {',
  ],
];

for (const [from, to] of edits) {
  const hits = src.split(from).length - 1;
  if (hits !== 1) {
    throw new Error("expected 1 match, found " + hits + " for:\n" + from);
  }
  src = src.replace(from, to);
}

writeFileSync(path, crlf ? src.split(LF).join(CR + LF) : src);
console.log("Pace.jsx patched, " + edits.length + " edits");
