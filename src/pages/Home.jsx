import { useCallback, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Rotator from "../Rotator.jsx";
import { run } from "../run.js";
import {
  RULE,
  effortHex,
  heightsFor,
  listKms,
  paceLabel,
  plural,
  spanLabel,
  summarise,
} from "../summary.js";
import { useReducedMotion } from "../motion.js";

const WAITLIST_KEY = "afterburner.waitlist";

// Every number on this page is computed from the session in run.js at render.
// Nothing here is typed in by hand, so the copy moves when the session does.
const SAMPLE = summarise(run.splits);

const FEATURES = [
  {
    id: "talk",
    title: "One button, then talk",
    body: "Press it once at the start and put the phone back in your pocket. Talking is the whole interface, so there is nothing to tap, swipe or read at threshold pace.",
    benefit: "Nothing to operate while you are running.",
    live: true,
    state:
      "In this build. Your browser does the listening, and where it cannot, a typed line takes over.",
  },
  {
    id: "pace",
    title: "Pace and effort on the same row",
    body: "The split is the wall clock gap between two spoken markers. The effort is the number you called out loud on that kilometre. One column you control, one column you do not, side by side.",
    benefit: "A number that does not negotiate, next to one that does.",
    live: false,
    state:
      "Read off the session recorded on the track. Turning a spoken marker into a split while you run is planned.",
  },
  {
    id: "rule",
    title: "One rule, written down",
    body: RULE + " That is the whole rule, and you are meant to be able to argue with it.",
    benefit: "You can check the arithmetic yourself.",
    live: true,
    state: "In this build.",
  },
  {
    id: "count",
    title: "Times you lied",
    body: "One count per run, taken from your own splits. It holds up whether the run was long, short, windy or slow, because it only ever compares you against what you said a few kilometres earlier.",
    benefit: "One number you can carry between runs.",
    live: true,
    state: "In this build.",
  },
  {
    id: "shape",
    title: "The run as a shape",
    body: "One block per kilometre. Height is seconds above your fastest, colour is the effort you called out, and a flagged kilometre is capped in white. The disagreements stand up before you read a single number.",
    benefit: "You see the gap before you count it.",
    live: true,
    state: "In this build. Drag it to turn it, or tap a block to read it.",
  },
  {
    id: "ghost",
    title: "The ghost of kilometre one",
    body: "Your first kilometre keeps running at its own pace for the rest of the session. It never gets tired and it is not a stranger, so the gap it opens is the fairest number in the app.",
    benefit: "The cost of drifting, in seconds you can feel.",
    live: true,
    state: "In this build.",
  },
  {
    id: "cadence",
    title: "Cadence from your pocket",
    body: "Steps per minute counted off the phone accelerometer, so a kilometre that slowed can be read against whether your legs slowed with it or your stride quietly shortened.",
    benefit: "A second witness on the same kilometre.",
    live: false,
    state:
      "The count runs live on the run screen. Writing a cadence onto each kilometre as you pass it is planned.",
  },
];

const STEPS = [
  {
    id: "one",
    n: "1",
    title: "Press once, at the start",
    body: "One control, sized for a thumb that is already moving. After that the phone can stay in your pocket for the whole run.",
  },
  {
    id: "two",
    n: "2",
    title: "Call the kilometre and the effort",
    body: "Say where you are and how hard it feels, out of ten. Two numbers is all it needs, and the clock does the rest.",
  },
  {
    id: "three",
    n: "3",
    title: "Stop, and read the disagreements",
    body: "The run comes back as blocks with the flagged kilometres capped, the rule that flagged them, and the count. What it means is yours to decide.",
  },
];

const QUESTIONS = [
  {
    q: "Is it really calling me a liar?",
    a: "It counts kilometres where the effort you reported held or fell while your pace slipped past the threshold. That is arithmetic on your own splits. The word is deliberately blunt, because the polite version of this number is the one everybody ignores.",
  },
  {
    q: "What if I do not want to talk out loud on a run?",
    a: "There is a typed fallback, and a note logged by typing is never presented as something you said. You lose the phrase, you keep the timing and the effort.",
  },
  {
    q: "How accurate is the pace?",
    a: "Exactly as accurate as your calling. Pace is measured from the wall clock gap between two markers, so a marker called ten seconds late pushes that kilometre slower and the next one faster. It is a measurement of when you spoke, and it does not pretend to be anything else.",
  },
  {
    q: "Does it know why I slowed down?",
    a: "No, and it never guesses. Wind, a hill, a crossing, a bad night, heavy legs. Afterburner measures the gap between what you said and what you did. It does not explain it, it does not diagnose anything, and it will not tell you what to do about your training or your health.",
  },
  {
    q: "Do I need a watch, a chest strap or an account?",
    a: "No. A phone, your voice and a clock. There is no account in this build, so nothing is uploaded and nothing is shared.",
  },
  {
    q: "Can I buy it?",
    a: "No. Nothing here is purchasable, no payment is built into this app, and no card is taken anywhere. Any price named anywhere in it is planned, not live.",
  },
];

export default function Home() {
  const [index, setIndex] = useState(0);
  const [said, setSaid] = useState("");
  const emailRef = useRef(null);
  const waitlistRef = useRef(null);
  const still = useReducedMotion();

  const bars = useMemo(() => {
    const heights = heightsFor(SAMPLE.rows);
    const width = SAMPLE.rows.length ? 100 / SAMPLE.rows.length : 0;
    return SAMPLE.rows.map((row, i) => ({
      km: row.km,
      x: i * width,
      w: width * 0.74,
      h: 6 + heights.norm[i] * 92,
      fill: effortHex(row.effort),
      flagged: SAMPLE.flagged.has(row.km),
    }));
  }, []);

  const goWaitlist = useCallback(() => {
    const section = waitlistRef.current;
    if (section) {
      section.scrollIntoView({
        behavior: still ? "auto" : "smooth",
        block: "start",
      });
    }
    const field = emailRef.current;
    if (field) field.focus({ preventScroll: true });
  }, [still]);

  const submit = (event) => {
    event.preventDefault();
    const value = emailRef.current ? emailRef.current.value.trim() : "";
    if (!value) {
      setSaid("Put an address in first.");
      return;
    }
    try {
      window.localStorage.setItem(WAITLIST_KEY, value);
      setSaid(
        "Kept in this browser only. Nothing has been sent anywhere, and there is nothing on this site to buy yet.",
      );
    } catch {
      setSaid(
        "This browser refused to store it, so nothing was saved. There is nothing on this site to buy yet either.",
      );
    }
  };

  const front = FEATURES[index];
  const worst = SAMPLE.collapse || SAMPLE.flags[0] || null;

  return (
    <main className="ab-page">
      <header className="ab-hero">
        <div className="ab-wrap">
          <h1 className="ab-h1">Train hard, and know which weeks were real.</h1>
          <p className="ab-lede">
            You press one button and talk while you run, calling the kilometre
            and the effort out loud. Afterburner times the gap between the
            kilometre you called and the kilometre you ran, then counts the ones
            where the two stopped agreeing.{" "}
            <strong>The headline number is times you lied.</strong>
          </p>
          <p className="ab-lede">
            A block you cannot trust is a block you cannot repeat. This is the
            record that tells you which sixteen weeks to build on, before you
            spend another sixteen.
          </p>
          <div className="ab-actions">
            <Link className="ab-btn ab-btn-solid" to="/run">
              Open the run view
            </Link>
            <button
              className="ab-btn ab-btn-ghost"
              type="button"
              onClick={goWaitlist}
            >
              Join the waitlist
            </button>
          </div>
          <p className="ab-note">
            Nothing here is purchasable. No payment is built into this app and
            no card is taken anywhere in it.
          </p>
        </div>
      </header>

      <section className="ab-sec">
        <div className="ab-wrap">
          <h2 className="ab-h2">Your watch recorded half of it.</h2>
          <p className="ab-p">
            Your watch has the pace and it has the cadence, and it will draw you
            both tonight. It never heard you say the kilometre felt easy. So the
            one comparison that decides whether a block is working, what you
            believed at the time against what you actually did, is the single
            thing nothing on your wrist is holding.
          </p>
          <p className="ab-p">
            The cost is quiet. The file you review in week eleven is a record of
            the runs, not of your judgement. You can see that the pace drifted.
            You cannot see that you called it easy the whole way down.{" "}
            <strong>
              The weeks are spent either way, and the part worth having back is
              the part that was never written down.
            </strong>
          </p>

          {bars.length ? (
            <figure className="ab-figure">
              <svg
                className="ab-chart"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                role="img"
                aria-label={
                  "The session recorded on the track, drawn as " +
                  bars.length +
                  " blocks, one for each kilometre, where taller means slower. " +
                  (SAMPLE.count
                    ? "Flagged: " + SAMPLE.flagList + "."
                    : "No kilometre in it was flagged.")
                }
              >
                {bars.map((bar) => (
                  <g key={bar.km}>
                    <rect
                      x={bar.x}
                      y={100 - bar.h}
                      width={bar.w}
                      height={bar.h}
                      fill={bar.fill}
                      opacity={bar.flagged ? 1 : 0.78}
                    />
                    {bar.flagged ? (
                      <rect
                        x={bar.x}
                        y={100 - bar.h}
                        width={bar.w}
                        height="3"
                        fill="#EDF1F6"
                      />
                    ) : null}
                  </g>
                ))}
              </svg>
              <p className="ab-legend">
                <span>
                  <i
                    className="ab-swatch"
                    style={{ background: effortHex(3) }}
                  />
                  Called easy
                </span>
                <span>
                  <i
                    className="ab-swatch"
                    style={{ background: effortHex(8) }}
                  />
                  Called hard
                </span>
                <span>
                  <i className="ab-swatch" style={{ background: "#EDF1F6" }} />
                  Flagged
                </span>
              </p>
              <figcaption className="ab-figcaption">
                One block per kilometre. Height is seconds above the fastest
                kilometre of that run, colour is the effort called out loud on
                it. Fastest {paceLabel(SAMPLE.fastest)} per kilometre, slowest{" "}
                {paceLabel(SAMPLE.slowest)}.
                {worst ? (
                  <>
                    {" "}
                    <strong>
                      Kilometre {worst.km} is the shape of the problem:{" "}
                      {worst.paceSlip} seconds a kilometre slower than the
                      kilometres before it, still called {worst.effort} out of
                      ten, with cadence down {worst.cadenceDrop} steps a minute.
                    </strong>
                  </>
                ) : null}
              </figcaption>
            </figure>
          ) : null}

          <p className="ab-note">
            Afterburner does not know why that kilometre slipped, and it does
            not guess. It measures the gap between what you said and what you
            did, hands it to you, and stops there. It is not a health check and
            it gives no advice about your training.
          </p>
        </div>
      </section>

      <section className="ab-sec">
        <div className="ab-wrap">
          <h2 className="ab-h2">Counters, and where they come from</h2>
          <p className="ab-p">
            There are no testimonials on this page, no user count, no ratings
            and no press logos, because this was built in a day and has nobody
            to quote. What can honestly be shown is the session recorded on the
            track, which ships inside the app so no screen is ever empty.
          </p>

          <div className="ab-counters">
            <div className="ab-counter">
              <span className="ab-counter-value">{SAMPLE.kms}</span>
              <span className="ab-counter-label">
                Kilometres spoken in that session
              </span>
              <span className="ab-counter-sub">Sample</span>
            </div>
            <div className="ab-counter">
              <span className="ab-counter-value">{run.distance}</span>
              <span className="ab-counter-label">
                Distance on the clock for it
              </span>
              <span className="ab-counter-sub">Sample</span>
            </div>
            <div className="ab-counter">
              <span className="ab-counter-value">{SAMPLE.count}</span>
              <span className="ab-counter-label">
                Kilometres the rule flagged in it
              </span>
              <span className="ab-counter-sub">Sample</span>
            </div>
          </div>

          <p className="ab-source">
            Built in one day at RUN/HACK London, on a 400 metre track, under the
            rule of the day: you may only build while running, and every change
            has to be dictated out loud. That session is one run. It is not a
            study, and it is not data from anyone else.
          </p>
        </div>
      </section>

      <section className="ab-sec">
        <div className="ab-wrap">
          <h2 className="ab-h2">What it does</h2>
          <p className="ab-p">
            Seven parts, each with what it is for, and each carrying whether it
            runs in this build or is still planned. Move it with the arrows, the
            dots, the arrow keys or a drag.
          </p>

          <Rotator
            items={FEATURES}
            index={index}
            onIndex={setIndex}
            label="What Afterburner does. Use the left and right arrow keys."
            type="TIMES YOU LIED"
            card={(item, isFront) => (
              <article className={isFront ? "ab-card ab-card-front" : "ab-card"}>
                <h3>{item.title}</h3>
                <p className="ab-card-body">{item.body}</p>
                <p className="ab-card-benefit">{item.benefit}</p>
                <p
                  className={
                    item.live ? "ab-card-foot ab-card-foot-live" : "ab-card-foot"
                  }
                >
                  {item.state}
                </p>
              </article>
            )}
          >
            <div className="ab-pill-row">
              {front.live ? (
                <Link className="ab-btn ab-btn-solid" to="/run">
                  See this on the run view
                </Link>
              ) : (
                <button
                  className="ab-btn ab-btn-solid"
                  type="button"
                  onClick={goWaitlist}
                >
                  Join the waitlist for this
                </button>
              )}
              <p className="ab-pill-note">
                {front.live
                  ? "This part runs today, on the session that ships with the app."
                  : "This part is not finished, so the button goes to the waitlist and nowhere else."}
              </p>
            </div>
          </Rotator>
        </div>
      </section>

      <section className="ab-sec">
        <div className="ab-wrap ab-wrap-narrow">
          <h2 className="ab-h2">Three steps</h2>
          <ol className="ab-steps">
            {STEPS.map((step) => (
              <li className="ab-step" key={step.id}>
                <span className="ab-kicker">STEP {step.n}</span>
                <h3 className="ab-h3">{step.title}</h3>
                <p className="ab-p">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="ab-sec">
        <div className="ab-wrap">
          <h2 className="ab-h2">Objections, and the limits</h2>
          <div className="ab-detail">
            {QUESTIONS.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="ab-sec" id="waitlist" ref={waitlistRef}>
        <div className="ab-wrap ab-wrap-narrow">
          <h2 className="ab-h2">Find out this week, not in week eleven.</h2>
          <p className="ab-p">
            The app is free to open right now and the recorded session is
            already in it. The waitlist is for the parts marked planned above
            and for nothing else. No card, no checkout, and no price attached to
            this form.
          </p>
          <form className="ab-form" onSubmit={submit}>
            <div className="ab-field">
              <label className="ab-label" htmlFor="home-email">
                Email
              </label>
              <input
                className="ab-input"
                id="home-email"
                ref={emailRef}
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@example.com"
              />
            </div>
            <button className="ab-btn ab-btn-solid" type="submit">
              Put me on it
            </button>
          </form>
          <p className="ab-said" role="status">
            {said}
          </p>
        </div>
      </section>

      <footer className="ab-footer">
        <div className="ab-wrap">
          <ul className="ab-footer-links">
            <li>
              <Link to="/run">Run view</Link>
            </li>
            <li>
              <Link to="/features">Features</Link>
            </li>
            <li>
              <Link to="/pricing">Pricing</Link>
            </li>
            <li>
              <Link to="/sessions">Sessions</Link>
            </li>
          </ul>
          <p>
            Afterburner. Built in one day at RUN/HACK London, on the track, with
            every change dictated out loud while running.
          </p>
          <p>
            {"Every number on this page is computed from that one session, " +
              plural(SAMPLE.kms, "spoken kilometre", "spoken kilometres") +
              ", " +
              spanLabel(SAMPLE.behind) +
              " behind the ghost of its own first kilometre by the finish" +
              (SAMPLE.count
                ? ", flagged at " + listKms(SAMPLE.flags.map((f) => f.km))
                : "") +
              "."}
          </p>
          <p>
            Nothing on this site is purchasable, no payment is built and no card
            is taken. Afterburner measures what you said against what you did.
            It is not a medical device, it does not diagnose anything, and it
            gives no advice about your training or your health.
          </p>
        </div>
      </footer>
    </main>
  );
}
