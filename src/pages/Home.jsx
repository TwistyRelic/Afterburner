// THE LANDING.
//
// Two rules shaped this page.
//
// 1. NOTHING AUTOPLAYS AND NOTHING IS GATED ON A REVEAL. Every section is
//    painted at its settled state on first render. There is no whileInView, no
//    scroll scrub and no interval driving a picture, because a section that has
//    to animate in is a blank section in any browser that does not run the
//    animation, and a scrub tied to scroll speed crawls in a slow demo.
// 2. THE EXHIBITS ARE THE REAL CODE. The nine row log and the tap demo below
//    both call createPlan, applyReading, adjust and projectedFinish from
//    ghostPacing.js. Nothing on this page is a number somebody typed in to make
//    a point, so the page cannot drift away from the product.

import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ZONES } from "../breath.js";
import {
  BOUNDS,
  ZONE_STEP,
  adjust,
  applyReading,
  createPlan,
  formatClock,
  formatPace,
  ghostDistanceAt,
  projectedFinish,
} from "../ghostPacing.js";

// THE WALKTHROUGH. A 10 km with a 50:00 goal, run easy, and a runner who tires
// and then comes back. The zones are the script; every pace and every finish
// time in the table is computed by the same functions the run screen calls.
const SCRIPT = [
  { at: 120, zone: 2 },
  { at: 720, zone: 3 },
  { at: 1020, zone: 4 },
  { at: 1320, zone: 4 },
  { at: 1620, zone: 4 },
  { at: 1920, zone: 3 },
  { at: 2220, zone: 2 },
  { at: 2520, zone: 1 },
  { at: 2820, zone: 1 },
];

function buildLog() {
  let plan = createPlan({ distanceKm: 10, goalSeconds: 3000, intent: "easy" });
  const rows = [];
  SCRIPT.forEach((beat) => {
    plan = applyReading(plan, { zone: beat.zone, elapsedSeconds: beat.at });
    // The walkthrough puts the runner on the ghost's own line, which is what
    // makes it a walkthrough rather than a recording. It is labelled as one.
    const done = ghostDistanceAt(plan.segments, beat.at);
    const ahead = projectedFinish(10, done, beat.at, plan.targetPace);
    rows.push({
      at: beat.at,
      zone: beat.zone,
      pace: plan.targetPace,
      finish: ahead ? ahead.finishSeconds : null,
    });
  });
  return rows;
}

// The demo below stands the runner halfway through the same 10 km, which is
// past the point where a comfortable reading has earned anything, so both
// directions can actually be shown.
const DEMO_ELAPSED = 1500;
const DEMO_GOAL = 3000;
const DEMO_DISTANCE = 10;
const DEMO_OPENING = 300;

const STEPS = [
  {
    n: "1",
    t: "Read one sentence out loud",
    b: "Twelve seconds, the same sentence every time, so two readings are comparable. That is the whole input. No strap, no watch, no mask.",
  },
  {
    n: "2",
    t: "It measures where you breathe",
    b: "How long you speak between breaths, how much of the sample is silence, and how often you breathe. That gives a zone, one to five.",
  },
  {
    n: "3",
    t: "The ghost re-paces, and says the new finish",
    b: "Above the band for today it eases and tells you what the finish becomes. Below it, with time gone by, it takes some back. Inside it, it holds.",
  },
];

const BUILT = [
  {
    t: "The talk test, from your own microphone",
    b: "Raw loudness becomes phrases and breaths. The audio is read frame by frame and thrown away.",
    s: "Working",
  },
  {
    t: "Five zones, and the guidance that follows",
    b: "Full sentences at one end, a word and a breath at the other, with what to do about it.",
    s: "Working",
  },
  {
    t: "The adaptive ghost",
    b: "A goal time becomes an opening pace, then every reading moves it, inside caps it cannot exceed.",
    s: "Working",
  },
  {
    t: "The honest finish time",
    b: "What you finish in if you hold this pace, restated after every reading. It is a projection and it says so.",
    s: "Working",
  },
  {
    t: "It asks out loud, and answers out loud",
    b: "The prompt and the verdict are spoken, so a reading needs no screen and no hands.",
    s: "Working",
  },
  {
    t: "Distance from the phone, or from your thumb",
    b: "Position fixes when there are any, a lap tap when there are not, and it says which one it used.",
    s: "Working, never run outdoors",
  },
  {
    t: "Nothing leaves the device",
    b: "No account, no server, no upload. The setup and the readings are kept in this browser.",
    s: "Working",
  },
  {
    t: "History across a training block",
    b: "Reading against reading, week against week, so a bad Tuesday can be seen for what it is.",
    s: "Not built",
  },
];

const FAQ = [
  {
    q: "Is this a lactate threshold test?",
    a: "No. It is the talk test, which is a coaching method: how much you can say between breaths tracks how hard you are working. A lactate measurement needs a needle and a laboratory. We measure speech, and we call it speech.",
  },
  {
    q: "Can it tell me something about my asthma?",
    a: "No. It is not a medical device. It does not diagnose anything, it does not treat anything, and it does not replace a clinician. All it can tell you is that your phrases are shorter than they were, and it does not know why.",
  },
  {
    q: "Has anyone built this before?",
    a: "We have not found one, and we have not searched the prior art properly either, so treat that as a hypothesis rather than a claim. The talk test is old and well known. Driving a pacer with it, live, from a phone microphone, is the part we have not seen.",
  },
  {
    q: "How much of the pacing is measured and how much is chosen?",
    a: "The zone is measured. Everything that turns a zone into a number of seconds is a calibration choice, and every one of them is marked as an assumption in the source. One zone of error is currently worth " + Math.round(ZONE_STEP * 1000) / 10 + " per cent of your current pace, which is the first number that should be calibrated against a real runner.",
  },
  {
    q: "How far can the ghost move?",
    a: "At a five minute pace, one reading moves it by at most " + Math.round(BOUNDS.maxEase) + " seconds per kilometre slower or " + Math.round(BOUNDS.maxPush) + " faster, and across a whole run it stays between " + formatPace(BOUNDS.fastestGhost) + " and " + formatPace(BOUNDS.slowestGhost) + " per km against a five minute goal. It eases about three times more readily than it pushes, because easing wrongly costs you a slower run and pushing wrongly costs you the run.",
  },
  {
    q: "What has actually been tested?",
    a: "The pacing arithmetic, in a browser and on its own. The run screen, driven end to end. What has not happened: nobody has run outdoors with it, no human voice has driven the zone through a whole session, the position filters have never met real satellite drift, and it has not been tested on an iPhone.",
  },
  {
    q: "Can it hear a lorry, or the person next to me?",
    a: "Yes. It reads loudness, not words, so a bus pulling away can look like a phrase. That is a real limitation and it is why a reading is capped rather than obeyed: one sample moves the ghost a little, and it takes several to move it a long way.",
  },
  {
    q: "What does it cost?",
    a: "Nothing, and nothing here is purchasable. There is no payment integration and no server. The prices on the pricing page are what we would charge, labelled planned, and every button on that page joins a list rather than taking money.",
  },
];

export default function Home() {
  const log = useMemo(() => buildLog(), []);
  const early = log[1] || null;
  const late = log[log.length - 1] || null;

  const [pace, setPace] = useState(DEMO_OPENING);
  const [move, setMove] = useState(null);

  const tap = useCallback(
    (zoneId) => {
      const next = adjust(pace, zoneId, "easy", DEMO_ELAPSED / DEMO_GOAL, {
        openingPace: DEMO_OPENING,
      });
      setPace(next.pace);
      setMove(next);
    },
    [pace],
  );

  const reset = useCallback(() => {
    setPace(DEMO_OPENING);
    setMove(null);
  }, []);

  const done = DEMO_ELAPSED / DEMO_OPENING;
  const projection = projectedFinish(DEMO_DISTANCE, done, DEMO_ELAPSED, pace);
  const demoFinish = projection ? projection.finishSeconds : DEMO_GOAL;
  const demoDelta = demoFinish - DEMO_GOAL;

  return (
    <main className="abhome">
      <header className="abhome-hero">
        <h1>Get to the finish, without blowing up at 8 km.</h1>
        <p className="abhome-lede">
          Every pacer runs the pace you asked for. Afterburner runs the pace you can
          actually hold today. You read one sentence out loud, it measures where you
          breathe, and the ghost you are chasing re-paces itself around the answer.
        </p>

        <div className="abhome-cta">
          <Link className="abhome-go" to="/goal">
            Set up a run
          </Link>
          <Link className="abhome-alt" to="/breath">
            Try the talk test, twelve seconds
          </Link>
        </div>

        {/* Both columns read their times off the same two rows of the worked
            run below, so the hero cannot quote a minute the table does not
            have. The left column is what a fixed pacer prints: the opening
            pace, on every row, for ever. */}
        <div className="abhome-versus">
          <div className="abhome-side">
            <div className="abhome-sideLabel">Any other pacer</div>
            {early && late
              ? [early, late].map((row) => (
                  <div className="abhome-sideRow" key={"deaf-" + row.at}>
                    <span className="abhome-sideWhen">
                      At {formatClock(row.at)}
                    </span>
                    <span className="abhome-sideNum">
                      {formatPace(DEMO_OPENING)}
                    </span>
                  </div>
                ))
              : null}
            <p className="abhome-sideNote">
              The same number, whatever is happening to you.
            </p>
          </div>
          <div className="abhome-side is-ours">
            <div className="abhome-sideLabel">Afterburner</div>
            {early && late
              ? [early, late].map((row) => (
                  <div className="abhome-sideRow" key={"ours-" + row.at}>
                    <span className="abhome-sideWhen">
                      At {formatClock(row.at)}
                    </span>
                    <span className="abhome-sideNum">{formatPace(row.pace)}</span>
                  </div>
                ))
              : null}
            <p className="abhome-sideNote">
              Both figures are computed by the pacing code, in the table below.
            </p>
          </div>
        </div>
      </header>

      <section className="abhome-sec">
        <h2>Every pacer is deaf.</h2>
        <p className="abhome-body">
          You set five minutes per kilometre and it holds five minutes per kilometre.
          It holds it at 24 degrees. It holds it on four hours of sleep. It holds it
          when your breathing is worse this week than last week, and it holds it while
          you come apart at 8 km. So people chase a number that was never right for
          today, and the run ends early.
        </p>
        <p className="abhome-body">
          A coach does not do that. A coach listens to you talk and slows you down.
          That is the whole idea here, and the talk test is how it gets measured.
        </p>

        <div className="abhome-log" role="table" aria-label="A worked 10 km, computed by the pacing code">
          <div className="abhome-logHead" role="row">
            <span role="columnheader">Time</span>
            <span role="columnheader">Zone</span>
            <span role="columnheader">Ghost</span>
            <span role="columnheader">Finish</span>
          </div>
          {log.map((row) => {
            const zone = ZONES.find((z) => z.id === row.zone) || ZONES[0];
            return (
              <div
                className="abhome-logRow"
                role="row"
                key={row.at}
                style={{ "--tone": zone.colour }}
              >
                <span className="abhome-logTime" role="cell">
                  {formatClock(row.at)}
                </span>
                <span className="abhome-logZone" role="cell">
                  Z{row.zone}
                </span>
                <span className="abhome-logPace" role="cell">
                  {formatPace(row.pace)}
                </span>
                <span className="abhome-logFinish" role="cell">
                  {formatClock(row.finish)}
                </span>
              </div>
            );
          })}
        </div>
        <p className="abhome-caption">
          A 10 km with a 50:00 goal, run easy. A deaf pacer prints 5:00 and 50:00 on
          every one of those rows, right up to the moment you stop. This table is a
          scripted walkthrough of the arithmetic, not a recording of a run: the zones
          are the script, and every pace and finish time is computed by the same
          functions the run screen calls.
        </p>
      </section>

      <section className="abhome-sec">
        <h2>Move it yourself.</h2>
        <p className="abhome-body">
          You are halfway through that 10 km. Press a zone and watch the ghost. This
          is the live pacing code, not a picture of it, and the same call the run
          screen makes when it hears you.
        </p>

        <div className="abhome-demo">
          <div className="abhome-demoTop">
            <div className="abhome-demoCell">
              <span className="abhome-demoLabel">Ghost pace</span>
              <span className="abhome-demoBig">{formatPace(pace)}</span>
              <span className="abhome-demoSmall">per kilometre</span>
            </div>
            <div className="abhome-demoCell">
              <span className="abhome-demoLabel">Finish, if you hold it</span>
              <span className="abhome-demoBig">{formatClock(demoFinish)}</span>
              <span className="abhome-demoSmall">
                {Math.abs(demoDelta) < 30
                  ? "on the 50:00 goal"
                  : formatClock(Math.abs(demoDelta)) +
                    (demoDelta > 0 ? " over" : " under") +
                    " the 50:00 goal"}
              </span>
            </div>
          </div>

          <div className="abhome-demoZones" role="group" aria-label="Pick a talk test reading">
            {ZONES.map((zone) => (
              <button
                key={zone.id}
                type="button"
                className="abhome-demoZone"
                style={{ "--tone": zone.colour }}
                onClick={() => tap(zone.id)}
              >
                <span className="abhome-demoZoneId">Z{zone.id}</span>
                <span className="abhome-demoZoneName">{zone.short}</span>
              </button>
            ))}
          </div>

          <p className="abhome-demoSay" role="status" aria-live="polite">
            {move
              ? "Zone " +
                move.zoneId +
                ". " +
                (move.direction === "ease"
                  ? "The ghost eased " +
                    Math.round(move.deltaSeconds) +
                    " s/km to " +
                    formatPace(move.pace) +
                    " per km."
                  : move.direction === "push"
                    ? "You have room, so the ghost picked up " +
                      Math.round(Math.abs(move.deltaSeconds)) +
                      " s/km to " +
                      formatPace(move.pace) +
                      " per km."
                    : "The ghost held " +
                      formatPace(move.pace) +
                      " per km. The reason: " +
                      move.reason +
                      ".") +
                (move.capped ? " That was capped at one step." : "")
              : "Nothing has been read yet, so the ghost is on the pace your goal implies."}
          </p>

          <button type="button" className="abhome-demoReset" onClick={reset}>
            Put it back to 5:00
          </button>
        </div>
      </section>

      <section className="abhome-sec">
        <h2>Three steps.</h2>
        <div className="abhome-steps">
          {STEPS.map((step) => (
            <div className="abhome-step" key={step.n}>
              <span className="abhome-stepN" aria-hidden="true">
                {step.n}
              </span>
              <h3>{step.t}</h3>
              <p>{step.b}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="abhome-sec">
        <h2>What is built, and what is not.</h2>
        <p className="abhome-body">
          No testimonials, no user count, no rating, no press, no logos, and no
          sponsor. Nobody has been quoted on this page because nobody has used it yet.
          Here is the whole list instead, with the honest state of each line.
        </p>
        <div className="abhome-built">
          {BUILT.map((item) => (
            <div className="abhome-builtRow" key={item.t}>
              <div className="abhome-builtHead">
                <h3>{item.t}</h3>
                <span
                  className={
                    item.s === "Not built"
                      ? "abhome-state is-off"
                      : "abhome-state"
                  }
                >
                  {item.s}
                </span>
              </div>
              <p>{item.b}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="abhome-sec">
        <h2>The awkward questions.</h2>
        <div className="abhome-faq">
          {FAQ.map((item) => (
            <details className="abhome-q" key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="abhome-close">
        <h2>Find out in twelve seconds.</h2>
        <p className="abhome-body">
          It runs on the phone in your hand. No account, no card, and nothing is
          uploaded.
        </p>
        <div className="abhome-cta">
          <Link className="abhome-go" to="/goal">
            Set up a run
          </Link>
          <Link className="abhome-alt" to="/pricing">
            See the planned prices
          </Link>
        </div>
        <p className="abhome-foot">
          Built in a day at RUN/HACK London, under the rule that you may only build
          while running and every change is dictated out loud. That is the reason the
          whole interface is a voice and one enormous button: anything that needed two
          hands did not survive the day. Afterburner is the talk test, which is a
          coaching method. It is not a lactate measurement, it is not a VO2 test, it
          does not diagnose or treat anything including asthma, and it does not replace
          a clinician. Stop if you feel unwell.
        </p>
      </section>
    </main>
  );
}
