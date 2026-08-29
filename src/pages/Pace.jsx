// THE LIVE RUN.
//
// One locked viewport. Nothing on this screen scrolls while a run is going,
// because a person moving at four metres a second does not scroll. Every pixel
// of the big panel is the talk test button, so it can be hit through a pocket
// or on an armband without aiming and without looking.
//
// WHAT IS MEASURED AND WHAT IS NOT. The zone is measured from your voice. The
// distance is measured from position fixes when there are any, and from your
// own taps when there are not. With neither, the screen says so and refuses to
// show a gap, because a gap you did not run is not a gap. Everything the ghost
// then does with a zone is a calibration choice, and ghostPacing.js marks each
// of those an assumption.
//
// This screen holds no run state of its own. useGhost.js owns the goal, the
// clock, the distance and the ghost's history, and ghostPacing.js owns the
// arithmetic. Two private copies of one number is how a screen and a hook end
// up telling a runner different things.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { TEST_SENTENCE, ZONES } from "../breath.js";
import { useBreath } from "../useBreath.js";
import { useGhost } from "../useGhost.js";
import {
  DUR,
  EASE,
  exitTransition,
  useCountUp,
  useReducedMotion,
} from "../motion.js";
import { BOUNDS, INTENTS, formatClock, formatPace } from "../ghostPacing.js";
import {
  DISTANCE_PRESETS,
  GOAL_MAX_SECONDS,
  GOAL_MIN_SECONDS,
  cautionFor,
  describeSoftening,
  loadSetup,
  takePendingStart,
} from "../runSetup.js";

// The talk test asks for itself on a schedule once the microphone has been
// granted once. The FIRST one is always a tap, because a browser will not open
// the microphone without a gesture, and pretending otherwise would fail
// silently at exactly the moment the runner cannot look at the phone.
const FIRST_PROMPT_AFTER = 120;

// How long the spoken prompt gets before the sample opens, so the runner hears
// the whole instruction before the twelve seconds start counting.
const PROMPT_LEAD_MS = 1800;

// How often the run asks out loud is read from the setup, because a run that
// declared something about breathing is asked more often. runSetup.js owns
// both numbers and both screens read them from there.

const zoneById = (id) => ZONES.find((zone) => zone.id === id) || null;

const sentenceCase = (text) =>
  text ? text.charAt(0).toUpperCase() + text.slice(1) : "";

function speak(text) {
  if (typeof window === "undefined" || !text) return;
  const synth = window.speechSynthesis;
  if (!synth || !window.SpeechSynthesisUtterance) return;
  try {
    synth.cancel();
    const said = new window.SpeechSynthesisUtterance(text);
    said.rate = 1.02;
    synth.speak(said);
  } catch {
    // A refused speech synthesiser is not a reason to stop the run.
  }
}

// ONE sentence, built once, then painted on the plate AND spoken. Two builders
// would drift, and the runner would hear one thing while reading another.
function verdictFor(entry, finishSeconds) {
  if (!entry) return "";
  const zone = zoneById(entry.zoneId);
  const head =
    "Zone " + entry.zoneId + (zone ? ", " + zone.name.toLowerCase() : "") + ".";
  const tail = Number.isFinite(finishSeconds)
    ? " Finish " + formatClock(finishSeconds) + " if you hold it."
    : "";
  const moved = Math.round(Math.abs(entry.deltaSeconds));

  if (entry.goalOutOfReach) {
    return (
      head +
      " The ghost is as slow as it goes, so the goal time has gone. Run the rest by feel." +
      tail
    );
  }

  const capped = entry.capped
    ? " Capped at one step, so it moves again at the next reading."
    : "";

  if (entry.direction === "ease") {
    return (
      head +
      " Ghost eased " +
      moved +
      " s/km to " +
      formatPace(entry.toPace) +
      " per km." +
      tail +
      capped
    );
  }
  if (entry.direction === "push") {
    return (
      head +
      " You have room, so the ghost picks up " +
      moved +
      " s/km to " +
      formatPace(entry.toPace) +
      " per km." +
      tail +
      capped
    );
  }
  return (
    head +
    " " +
    sentenceCase(entry.reason) +
    ", so the ghost holds " +
    formatPace(entry.toPace) +
    " per km." +
    tail
  );
}

// A colour never goes into an inline `color`. It goes into a custom property
// that a stylesheet rule reads, because an inline colour loses to any rule
// carrying `!important`, and this app already has blanket ink rules that do.
// A custom property set inline always applies, so the tone survives whatever
// else the stylesheet is doing.
function Cell({ label, value, unit, note, tone, noteTone }) {
  const style = {};
  if (tone) style["--tone"] = tone;
  if (noteTone) style["--note-tone"] = noteTone;
  return (
    <div className="abrun-cell" style={style}>
      <div className="abrun-label">{label}</div>
      <div className={tone ? "abrun-value is-toned" : "abrun-value"}>
        {value}
        {unit ? <span className="abrun-unit">{unit}</span> : null}
      </div>
      <div className={noteTone ? "abrun-note is-toned" : "abrun-note"}>{note}</div>
    </div>
  );
}

export default function Pace() {
  const still = useReducedMotion();
  const breath = useBreath();

  // What the goal screen last wrote, so this screen is not a second private
  // copy of the same four questions. A pure read, so the strict development
  // double render cannot make it mean two different things.
  const saved = useMemo(() => loadSetup(), []);
  const ghost = useGhost({
    distanceKm: saved.distanceKm,
    goalSeconds: saved.goalSeconds,
    intent: saved.intent,
    factors: saved.factors,
  });

  const [voice, setVoice] = useState(true);
  const [armed, setArmed] = useState(false); // the microphone has been granted
  const [noSpeech, setNoSpeech] = useState(false);
  const [barHeight, setBarHeight] = useState(null);

  const lastSampleRef = useRef(null);
  const nextPromptRef = useRef(FIRST_PROMPT_AFTER);

  // useBreath and useGhost both hand back a fresh object on every render, and
  // useBreath re-renders at frame rate while it is listening. Reading them
  // through refs keeps them out of effect dependency arrays. Measured: with
  // `breath` in the prompt effect's deps, the one second interval was torn down
  // and rebuilt twice a second by the clock alone, so the spoken prompt could
  // never fire at all.
  const breathRef = useRef(breath);
  const ghostRef = useRef(ghost);
  const voiceRef = useRef(voice);
  breathRef.current = breath;
  ghostRef.current = ghost;
  voiceRef.current = voice;

  const {
    running,
    finished,
    plan,
    elapsed,
    doneKm,
    distanceKm,
    goalSeconds,
    intent,
    distanceSource,
    measured,
    laps,
    gap,
    finish,
    lastReading,
    openingPace,
    soft,
    promptEvery,
    geolocation,
  } = ghost;

  // THE BOTTOM BAR, MEASURED RATHER THAN ASSUMED. `--tabbar-h` sits on :root at
  // 64px whether the bar is mounted or not, and it is not mounted on every
  // route. Measured on this route in a browser: no bar, so trusting the
  // variable reserved 64px of dead black under the fine print and stole it from
  // the panel. Reserve what is actually painted.
  useEffect(() => {
    const read = () => {
      const bar = document.querySelector(".tabbar");
      const box = bar ? bar.getBoundingClientRect() : null;
      setBarHeight(box && box.height > 0 ? Math.round(box.height) : 0);
    };
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  // A finished sample becomes a pace change, once, and is then spoken in the
  // same words that appear on the plate.
  useEffect(() => {
    const result = breath.result;
    if (!result) return;
    if (lastSampleRef.current === result.at) return;
    lastSampleRef.current = result.at;
    setArmed(true);

    // A sample with nothing loud enough to be speech in it is a real outcome
    // and it has to be said. Measured in a browser on a silent microphone: an
    // earlier build returned here and the plate went on reading "no reading
    // yet", so a runner whose microphone was covered got no answer and no
    // reason.
    if (!result.zone) {
      setNoSpeech(true);
      if (voiceRef.current) speak("I did not hear that. Say it again, a bit louder.");
      return;
    }
    setNoSpeech(false);

    const live = ghostRef.current;
    if (!live.running) return;
    const at = live.secondsNow();
    const applied = live.applyZone(result.zone, at);
    if (!applied || !applied.entry) return;
    nextPromptRef.current = at + live.promptEvery;
    if (voiceRef.current) {
      speak(
        verdictFor(
          applied.entry,
          applied.finish ? applied.finish.finishSeconds : null,
        ) + cautionFor(live.soft, applied.entry.zoneId),
      );
    }
  }, [breath.result]);

  const runTest = useCallback(() => {
    const live = breathRef.current;
    if (live.state === "listening") {
      live.stop();
      return;
    }
    setNoSpeech(false);
    if (voiceRef.current) speak("Talk test. Read the sentence.");
    live.start();
  }, []);

  // THE PROMPT. Once the microphone has been granted once, the run asks for the
  // next reading out loud on a schedule, so a talk test needs no screen and no
  // hands. It only ever runs inside a run the runner started, and the toggle at
  // the bottom of the screen turns it off.
  useEffect(() => {
    if (!running || !armed || !voice) return undefined;
    let pending = 0;
    const id = window.setInterval(() => {
      const live = ghostRef.current;
      const seconds = live.secondsNow();
      if (seconds < nextPromptRef.current) return;
      if (breathRef.current.state === "listening") return;
      nextPromptRef.current = seconds + live.promptEvery;
      speak("Talk test. Read the sentence.");
      pending = window.setTimeout(() => breathRef.current.start(), PROMPT_LEAD_MS);
    }, 1000);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(pending);
    };
  }, [running, armed, voice]);

  // ONE start path, used by the button on this screen and by an arrival from
  // the goal screen, so a run cannot begin two slightly different ways.
  const startWith = useCallback((setup) => {
    // A sample left over from a previous run must not be replayed into this one
    // at second zero. Marking it consumed is the guard.
    lastSampleRef.current = breathRef.current.result
      ? breathRef.current.result.at
      : null;
    nextPromptRef.current = FIRST_PROMPT_AFTER;
    setNoSpeech(false);
    setArmed(false);
    const made = ghostRef.current.start(setup);
    if (made && voiceRef.current) {
      speak(
        "Run started. The ghost is on " +
          formatPace(made.targetPace) +
          " per kilometre. Tap the screen when you are ready for the first talk test.",
      );
    }
    return made;
  }, []);

  // ARRIVING FROM THE GOAL SCREEN. The press that starts a run happened one
  // screen ago, and the token that carries it lives in memory only, so a
  // reload, a bookmark or a plain link to this page never starts a clock by
  // itself.
  useEffect(() => {
    const pending = takePendingStart();
    if (pending) startWith(pending);
  }, [startWith]);

  const endRun = useCallback(() => {
    if (breathRef.current.state === "listening") breathRef.current.stop();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    ghostRef.current.end();
  }, []);

  const newRun = useCallback(() => {
    ghostRef.current.reset();
    setArmed(false);
    setNoSpeech(false);
  }, []);

  const lap = useCallback(() => {
    const marked = ghostRef.current.markKilometre();
    if (marked && voiceRef.current) {
      speak("Kilometre " + marked.index + ". " + formatPace(marked.lapPace) + ".");
    }
  }, []);

  const listening = breath.state === "listening";
  const countdown = Math.max(0, Math.ceil(breath.sampleSeconds - breath.elapsed));
  const lastZone = lastReading ? zoneById(lastReading.zoneId) : null;
  const zoneColour = lastZone ? lastZone.colour : "#232A34";

  const ghostPaceValue = plan ? plan.targetPace : openingPace;
  // The ghost pace is an odometer: settled on first paint, and it rolls only
  // when a reading actually moves it. That roll IS the ghost re-pacing, and it
  // is the one piece of motion on this screen that means something.
  const ghostPace = useCountUp(ghostPaceValue, { format: formatPace });

  const finishSeconds = finish ? finish.finishSeconds : goalSeconds;
  const goalDelta = finishSeconds - goalSeconds;
  const goalClause =
    Math.abs(goalDelta) < 30
      ? "on the " + formatClock(goalSeconds) + " goal"
      : formatClock(Math.abs(goalDelta)) +
        (goalDelta > 0 ? " over" : " under") +
        " the " +
        formatClock(goalSeconds) +
        " goal";

  const gapSeconds = gap ? Math.abs(gap.seconds) : 0;
  const gapMetres = gap ? Math.abs(gap.metres) : 0;
  const level = gapSeconds < 1;
  const gapTone = level ? "#EDF1F6" : gap && gap.ahead ? "#4FD1A5" : "#FF8A3D";

  const selectedIntent = INTENTS.find((option) => option.id === intent) || INTENTS[0];
  const enter = { duration: still ? 0 : DUR.reveal, ease: EASE };

  const distanceNote =
    distanceSource === "gps"
      ? "measured"
      : distanceSource === "manual"
        ? laps.length + (laps.length === 1 ? " lap tapped" : " laps tapped")
        : "tap Lap";

  // The sentence painted below is the same string the voice said, minus the
  // zone opener, which is repeated in the zone's own colour.
  const verdictText =
    verdictFor(lastReading, finishSeconds) +
    cautionFor(soft, lastReading ? lastReading.zoneId : null);
  const verdictBody = verdictText.slice(verdictText.indexOf(".") + 1);

  const shellStyle = {};
  if (barHeight != null) shellStyle["--abrun-bar"] = barHeight + "px";

  return (
    <div className="abrun" style={shellStyle}>
      {/* ROW 1: the things that are simply true, and where each one came from.
          Never a guess wearing a measurement's clothes. */}
      <div className="abrun-strip">
        {plan ? (
          <>
            <Cell
              label="Elapsed"
              value={formatClock(elapsed)}
              note={"of " + formatClock(goalSeconds)}
            />
            <Cell
              label="Distance"
              value={doneKm.toFixed(2)}
              unit="km"
              note={distanceNote}
              noteTone={measured ? null : "#FF8A3D"}
            />
            <Cell
              label="Reading"
              value={lastZone ? "Zone " + lastZone.id : "Not yet"}
              tone={lastZone ? lastZone.colour : null}
              note={
                lastZone && breath.result && breath.result.phraseLength != null
                  ? breath.result.phraseLength + " s/breath"
                  : "tap the panel"
              }
            />
          </>
        ) : (
          <>
            <Cell
              label="Distance"
              value={distanceKm.toFixed(1)}
              unit="km"
              note="set below"
            />
            <Cell label="Goal" value={formatClock(goalSeconds)} note="set below" />
            <Cell label="Opening" value={formatPace(openingPace)} note="per km" />
          </>
        )}
      </div>

      {/* ROW 2: the stage. Before a run it is the setup, after one it is the
          finish card, and during one it is the whole talk test trigger. */}
      {!plan ? (
        <div className="abrun-setup">
          <h1>What is the run, and what is today meant to be?</h1>

          <div>
            <div className="abrun-label" id="abrun-dist">
              Distance
            </div>
            <div className="abrun-chips" role="group" aria-labelledby="abrun-dist">
              {DISTANCE_PRESETS.map((option) => (
                <button
                  key={option.km}
                  type="button"
                  className={
                    distanceKm === option.km ? "abrun-pick is-on" : "abrun-pick"
                  }
                  aria-pressed={distanceKm === option.km}
                  onClick={() => ghost.setDistanceKm(option.km)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="abrun-label" id="abrun-goal">
              Goal time
            </div>
            <div className="abrun-stepper">
              <button
                type="button"
                className="abrun-step"
                aria-label="One minute faster"
                onClick={() =>
                  ghost.setGoalSeconds(Math.max(GOAL_MIN_SECONDS, goalSeconds - 60))
                }
              >
                &minus;
              </button>
              <div className="abrun-goalValue" role="status" aria-live="polite">
                {formatClock(goalSeconds)}
              </div>
              <button
                type="button"
                className="abrun-step"
                aria-label="One minute slower"
                onClick={() =>
                  ghost.setGoalSeconds(Math.min(GOAL_MAX_SECONDS, goalSeconds + 60))
                }
              >
                +
              </button>
            </div>
          </div>

          <div>
            <div className="abrun-label" id="abrun-intent">
              Today is
            </div>
            <div className="abrun-chips" role="group" aria-labelledby="abrun-intent">
              {INTENTS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={intent === option.id ? "abrun-pick is-on" : "abrun-pick"}
                  aria-pressed={intent === option.id}
                  onClick={() => ghost.setIntent(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="abrun-fine">
              {selectedIntent.label} targets {selectedIntent.band}. Inside that band
              the ghost does not move.
            </p>
          </div>

          <p className="abrun-fine">
            Read a sentence out loud during the run and the ghost re-paces around
            what your breathing says, by at most {Math.round(BOUNDS.maxEase)} s/km
            slower or {Math.round(BOUNDS.maxPush)} faster per reading at a five
            minute pace. This is the talk test, a coaching method, and not a medical
            measurement. It does not diagnose or treat anything, including asthma,
            and it does not replace a clinician.
          </p>

          <Link className="abrun-quiet" to="/goal">
            Set the run up properly, with the optional breathing question
          </Link>
        </div>
      ) : finished ? (
        <div className="abrun-setup">
          <h1>Run finished.</h1>
          <p className="abrun-body">
            {formatClock(elapsed)} on the clock, {doneKm.toFixed(2)} km{" "}
            {measured ? "measured" : "recorded"}, and the ghost finished on{" "}
            {formatPace(ghostPaceValue)} per km after{" "}
            {plan.readings.length === 1
              ? "one reading"
              : plan.readings.length + " readings"}
            .
          </p>
          <p className="abrun-body">
            {plan.readings.length
              ? "It started on " +
                formatPace(plan.openingPace) +
                " per km, which is what your goal implied, and moved because of what it heard."
              : "It held " +
                formatPace(plan.openingPace) +
                " per km the whole way, because it never heard a reading."}
          </p>
          <p className="abrun-fine">
            Nothing was uploaded and nothing was recorded to a file. The talk test
            reads the loudness of each frame and throws the audio away.
          </p>
        </div>
      ) : (
        <button
          type="button"
          className="abrun-stage"
          onClick={runTest}
          aria-label={listening ? "Stop the talk test" : "Start a talk test"}
        >
          <span
            className="abrun-zonebar"
            style={{ "--tone": zoneColour }}
            aria-hidden="true"
          />

          {listening ? (
            <>
              <span className="abrun-label">Read this out loud</span>
              <span className="abrun-count">{countdown}</span>
              <span className="abrun-sentence">{TEST_SENTENCE}</span>
              <span className="abrun-level" aria-hidden="true">
                <i
                  style={{
                    transform: "scaleX(" + Math.min(1, breath.level * 14) + ")",
                  }}
                />
              </span>
              <span className="abrun-hint">Keep reading. Breathe when you need to.</span>
            </>
          ) : measured ? (
            <>
              <span className="abrun-label">Gap to the ghost</span>
              <span className="abrun-hero is-toned" style={{ "--tone": gapTone }}>
                {gapSeconds}
                <span className="abrun-heroUnit">s</span>
              </span>
              <span className="abrun-heroNote is-toned" style={{ "--tone": gapTone }}>
                {level
                  ? "level with the ghost"
                  : (gap && gap.ahead ? "ahead, " : "behind, ") + gapMetres + " m"}
              </span>

              <span className="abrun-rule">
                <span className="abrun-ruleLabel">
                  {soft.on ? "Ghost, gentle" : "Ghost"}
                </span>
                <span ref={ghostPace.ref} className="abrun-ruleValue">
                  {ghostPace.text}
                </span>
                <span className="abrun-ruleUnit">/km</span>
              </span>

              <span className="abrun-under">
                Finish {formatClock(finishSeconds)} if you hold this pace,{" "}
                {goalClause}.
              </span>
              <span className="abrun-hint">
                {armed ? "Tap anywhere, or wait to be asked" : "Tap anywhere to talk"}
              </span>
            </>
          ) : (
            <>
              {/* With no distance there is no honest gap and no honest finish
                  time, so neither is shown. The ghost pace is true either way,
                  it is the thing you act on, and it is the thing a reading
                  moves, so it takes the largest type on the screen instead. */}
              <span className="abrun-label">
                {soft.on ? "Ghost pace, gentle" : "Ghost pace"}
              </span>
              <span
                ref={ghostPace.ref}
                className="abrun-hero is-toned"
                style={{ "--tone": zoneColour }}
              >
                {ghostPace.text}
              </span>
              <span className="abrun-heroNote">per kilometre</span>

              <span className="abrun-rule">
                <span className="abrun-ruleLabel">Goal</span>
                <span className="abrun-ruleValue">{formatClock(goalSeconds)}</span>
                <span className="abrun-ruleUnit">
                  for {distanceKm.toFixed(1)} km
                </span>
              </span>

              <span className="abrun-under">
                {geolocation.error
                  ? geolocation.error
                  : "No distance yet, so there is no gap to show. Tap Lap as you pass each kilometre."}
              </span>
              <span className="abrun-hint">
                {armed ? "Tap anywhere, or wait to be asked" : "Tap anywhere to talk"}
              </span>
            </>
          )}
        </button>
      )}

      {/* ROW 3: what the last reading did, and why, in the words it was spoken
          in. Only once a run exists: before one it would say nothing useful and
          push the setup form below the fold, measured at 390 by 844. */}
      {plan && !finished ? (
        <div
          className="abrun-verdict"
          style={{ "--tone": breath.error ? "#FF8A3D" : zoneColour }}
          role="status"
          aria-live="polite"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={
                breath.error
                  ? "error"
                  : noSpeech
                    ? "nospeech"
                    : lastReading
                      ? lastReading.at
                      : "none"
              }
              style={{ display: "block" }}
              initial={{ opacity: 0, y: still ? 0 : 6 }}
              animate={{ opacity: 1, y: 0, transition: enter }}
              exit={{ opacity: 0, transition: exitTransition(DUR.reveal) }}
            >
              {breath.error ? (
                <>
                  <strong className="abrun-warn">No microphone.</strong>{" "}
                  {breath.error} The ghost holds {formatPace(ghostPaceValue)} per km
                  until it can hear you.
                </>
              ) : noSpeech ? (
                <>
                  <strong className="abrun-warn">Nothing to measure.</strong> That
                  sample had no speech loud enough to read. The ghost has not moved.
                  Tap and say it again, a bit louder.
                </>
              ) : lastReading && lastZone ? (
                <>
                  <strong
                    className="abrun-zoneName"
                    style={{ "--tone": lastZone.colour }}
                  >
                    Zone {lastZone.id}, {lastZone.name.toLowerCase()}.
                  </strong>
                  {verdictBody}
                </>
              ) : (
                <>
                  No reading yet. The ghost runs the pace your goal implies,{" "}
                  {formatPace(openingPace)} per km, until it has heard you.
                </>
              )}
            </motion.span>
          </AnimatePresence>
        </div>
      ) : null}

      {/* ROW 4: every adjustment so far, newest first. No panel behind it:
          chips on a card would be a card inside a card. */}
      {plan ? (
        <div
          className="abrun-history"
          aria-label="Every ghost adjustment this run, newest first"
        >
          {plan.readings.length ? (
            plan.readings.map((entry) => {
              const zone = zoneById(entry.zoneId);
              return (
                <div
                  key={entry.at + "-" + entry.zoneId}
                  className="abrun-hchip"
                  style={{ "--tone": zone ? zone.colour : "#232A34" }}
                >
                  <div className="abrun-htime">{formatClock(entry.at)}</div>
                  <div className="abrun-hmove">
                    <span className="abrun-hzone">Z{entry.zoneId}</span>
                    <span>
                      {entry.direction === "hold" ? "held" : formatPace(entry.toPace)}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="abrun-hempty">No adjustments yet</div>
          )}
        </div>
      ) : null}

      {/* ROW 5: the controls, thumb height, at the bottom edge. */}
      <div className="abrun-controls">
        {!plan ? (
          <button type="button" className="abrun-btn" onClick={() => startWith()}>
            Start the run
          </button>
        ) : finished ? (
          <button type="button" className="abrun-btn" onClick={newRun}>
            Set up another run
          </button>
        ) : (
          <>
            <button type="button" className="abrun-btn" onClick={runTest}>
              {listening ? "Stop, use what I said" : "Talk test"}
            </button>
            {distanceSource === "gps" ? null : (
              <button type="button" className="abrun-btn is-quiet" onClick={lap}>
                Lap
              </button>
            )}
            <button type="button" className="abrun-btn is-quiet" onClick={endRun}>
              End
            </button>
          </>
        )}
      </div>

      <div className="abrun-foot">
        <label className="abrun-toggle">
          <input
            type="checkbox"
            checked={voice}
            onChange={(event) => setVoice(event.target.checked)}
          />
          Ask me out loud, about every {Math.round(promptEvery / 60)} minutes
        </label>
        <p className="abrun-fine">
          Talk test, not a medical test. It does not diagnose or treat anything.
        </p>
      </div>

      <p className="abrun-sr">
        The zone comes from how long you speak between breaths. It is the talk
        test, a coaching method, and not a medical measurement. Nothing here
        diagnoses or treats any condition, including asthma, and it does not
        replace a clinician.
        {soft.on ? " " + describeSoftening(soft) : ""}
      </p>
    </div>
  );
}
