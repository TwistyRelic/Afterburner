// Executes the real setup module and the real pacing against it. Nothing here
// is asserted from reading the code: every line below prints what running it
// actually produced.
import {
  INTENTS,
  applyReading,
  createPlan,
  formatPace,
} from "../src/ghostPacing.js";
import {
  BREATHING_FACTORS,
  cautionFor,
  describeSoftening,
  normaliseSetup,
  railNote,
  softeningFor,
  summaryLine,
  requestStart,
  takePendingStart,
} from "../src/runSetup.js";

let failures = 0;
const check = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failures += 1;
  console.log((ok ? "PASS " : "FAIL ") + name + "  got " + JSON.stringify(got));
};

console.log("--- normaliseSetup, against junk ---");
check("no input", normaliseSetup(undefined), {
  distanceKm: 10,
  goalSeconds: 3000,
  intent: "easy",
  factors: [],
});
check("garbage fields", normaliseSetup({ distanceKm: "ten", goalSeconds: NaN, intent: "sprint", factors: "asthma" }), {
  distanceKm: 10,
  goalSeconds: 3000,
  intent: "easy",
  factors: [],
});
check("clamped and quantised", normaliseSetup({ distanceKm: 900, goalSeconds: 7, intent: "race", factors: ["asthma", "moon"] }), {
  distanceKm: 60,
  goalSeconds: 120,
  intent: "race",
  factors: ["asthma"],
});
check("22:30 survives", normaliseSetup({ distanceKm: 5, goalSeconds: 1350, intent: "race", factors: [] }).goalSeconds, 1350);

console.log("\n--- the handoff is one shot and in memory only ---");
requestStart({ distanceKm: 5, goalSeconds: 1500, intent: "race", factors: ["heat"] });
const first = takePendingStart();
check("first take has it", first && first.distanceKm, 5);
check("second take is empty", takePendingStart(), null);

console.log("\n--- what one declared factor does to the ghost, per intent ---");
console.log("intent      pacedAs     prompt  zone3          zone4          zone2");
for (const option of INTENTS) {
  const plain = softeningFor(option.id, []);
  const soft = softeningFor(option.id, ["asthma"]);

  const row = (intent, zone) => {
    const plan = createPlan({ distanceKm: 10, goalSeconds: 3000, intent });
    // 40 minutes into a 50 minute goal, so the push gate is fully open.
    const next = applyReading(plan, { zone, elapsedSeconds: 2400 });
    return formatPace(next.targetPace);
  };

  const cell = (zone) =>
    (row(plain.pacedAs, zone) + " to " + row(soft.pacedAs, zone)).padEnd(15);

  console.log(
    option.id.padEnd(12) +
      soft.pacedAs.padEnd(12) +
      String(soft.promptEvery).padEnd(8) +
      cell(3) +
      cell(4) +
      cell(2),
  );
}

console.log("\n--- a softened ghost is never faster than the plain one ---");
let violations = 0;
for (const option of INTENTS) {
  for (let zone = 1; zone <= 5; zone += 1) {
    for (const at of [0, 600, 1200, 2400, 2900]) {
      const plain = createPlan({ distanceKm: 10, goalSeconds: 3000, intent: softeningFor(option.id, []).pacedAs });
      const soft = createPlan({ distanceKm: 10, goalSeconds: 3000, intent: softeningFor(option.id, ["cold"]).pacedAs });
      const a = applyReading(plain, { zone, elapsedSeconds: at }).targetPace;
      const b = applyReading(soft, { zone, elapsedSeconds: at }).targetPace;
      if (b < a - 0.0001) violations += 1;
    }
  }
}
check("violations over 125 combinations", violations, 0);

console.log("\n--- the sentences, run not quoted ---");
console.log(describeSoftening(softeningFor("easy", [])));
console.log(describeSoftening(softeningFor("threshold", ["asthma"])));
console.log(describeSoftening(softeningFor("race", ["hayfever", "heat"])));
console.log(describeSoftening(softeningFor("intervals", ["cold", "heat", "altitude"])));
console.log(describeSoftening(softeningFor("easy", ["asthma"])));
console.log("caution z3:" + JSON.stringify(cautionFor(softeningFor("easy", ["asthma"]), 3)));
console.log("caution z4:" + cautionFor(softeningFor("easy", ["asthma"]), 4));
console.log("caution z5 with nothing declared:" + JSON.stringify(cautionFor(softeningFor("easy", []), 5)));
console.log(summaryLine({ distanceKm: 10, goalSeconds: 3000, intent: "easy", factors: [] }));
console.log(summaryLine({ distanceKm: 5, goalSeconds: 1350, intent: "race", factors: [] }));
console.log("rail note, 5 km in 2 minutes: " + railNote({ distanceKm: 5, goalSeconds: 120, intent: "race", factors: [] }));
console.log("rail note, a sane goal: " + JSON.stringify(railNote({ distanceKm: 10, goalSeconds: 3000, intent: "easy", factors: [] })));

console.log("\n--- every factor id is offered and understood ---");
check(
  "round trip",
  normaliseSetup({ distanceKm: 10, goalSeconds: 3000, intent: "easy", factors: BREATHING_FACTORS.map((f) => f.id) }).factors,
  BREATHING_FACTORS.map((f) => f.id),
);

console.log("\n" + (failures === 0 ? "ALL CHECKS PASSED" : failures + " CHECKS FAILED"));
process.exit(failures === 0 ? 0 : 1);
