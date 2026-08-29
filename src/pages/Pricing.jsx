// PRICING.
//
// Nothing on this page can be bought. There is no payment integration, no
// server and no account, so every price is labelled planned and every button
// records an interest in this browser rather than taking money. The rotator is
// driven by a reader: a button, an arrow key, a dot or a drag. It does not
// autoplay, it is not scrubbed by scroll position, and it paints at its settled
// state on first render, because a scrub tied to scroll speed crawls in a slow
// demo, which is exactly when it is being watched.

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { DUR, EASE, exitTransition, useReducedMotion } from "../motion.js";

const WAITLIST_KEY = "afterburner.interest";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "£0",
    unit: "what the app does today",
    tone: "#3AA0FF",
    line: "The talk test, your zone, and the adaptive ghost. No card and no account on any server.",
    items: [
      "The talk test, from your own microphone",
      "Five zones and the guidance",
      "The adaptive ghost and the honest finish time",
      "Spoken prompts and spoken verdicts",
      "Your last readings, kept on this device",
    ],
  },
  {
    id: "monthly",
    name: "Monthly",
    price: "£4.99",
    unit: "a month, planned",
    tone: "#FF4D2D",
    wanted: true,
    line: "Everything, kept. Your readings tracked across a whole training block instead of falling off the end.",
    items: [
      "Everything in Free",
      "Full history, nothing falls off",
      "Reading against reading over weeks",
      "Session against session",
      "Export as CSV",
    ],
  },
  {
    id: "year",
    name: "Year",
    price: "£39",
    unit: "a year, planned",
    tone: "#4FD1A5",
    line: "The same thing, one payment, and nothing to cancel.",
    items: [
      "Everything in Monthly",
      "Two months cheaper",
      "One payment, no renewal",
      "Block against block",
    ],
  },
];

// Every row states what is true in this build before it states who would get
// it. A comparison table that only shows ticks is a sales sheet, not an answer.
const ROWS = [
  { state: "Built", label: "The talk test, measured from your microphone", free: true, monthly: true, year: true },
  { state: "Built", label: "Five zones, and the guidance that follows", free: true, monthly: true, year: true },
  { state: "Built", label: "The adaptive ghost, re-paced by your breathing", free: true, monthly: true, year: true },
  { state: "Built", label: "The honest finish time, restated after every reading", free: true, monthly: true, year: true },
  { state: "Built", label: "Asks out loud, answers out loud", free: true, monthly: true, year: true },
  { state: "Built", label: "Distance from position fixes, or from a lap tap", free: true, monthly: true, year: true },
  { state: "Built", label: "Works with no signal, no wearable and no account", free: true, monthly: true, year: true },
  { state: "Built", label: "Readings kept on this device", free: "Recent", monthly: "All", year: "All" },
  { state: "Not built", label: "History across a training block", free: false, monthly: true, year: true },
  { state: "Not built", label: "Session against session", free: false, monthly: true, year: true },
  { state: "Not built", label: "Export as CSV", free: false, monthly: true, year: true },
  { state: "Not built", label: "Carried across two devices", free: false, monthly: true, year: true },
  { state: "Not built", label: "Block against block", free: false, monthly: false, year: true },
];

function Cell({ value }) {
  if (value === true) {
    return (
      <span className="abcost-yes" aria-label="included">
        Yes
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="abcost-no" aria-label="not included">
        No
      </span>
    );
  }
  return <span className="abcost-word">{value}</span>;
}

export default function Pricing() {
  const still = useReducedMotion();
  const [front, setFront] = useState(1);
  const [wanted, setWanted] = useState(PLANS[1].id);
  const [email, setEmail] = useState("");
  const [noted, setNoted] = useState(null);
  const dragRef = useRef(null);
  const formRef = useRef(null);
  const count = PLANS.length;

  const go = useCallback(
    (delta) => setFront((current) => (current + delta + count) % count),
    [count],
  );

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const onDown = (event) => {
    dragRef.current = event.touches ? event.touches[0].clientX : event.clientX;
  };
  const onUp = (event) => {
    if (dragRef.current == null) return;
    const x = event.changedTouches ? event.changedTouches[0].clientX : event.clientX;
    const dx = x - dragRef.current;
    if (Math.abs(dx) > 42) go(dx < 0 ? 1 : -1);
    dragRef.current = null;
  };

  const active = PLANS[front];

  const choose = useCallback((id) => {
    setWanted(id);
    setNoted(null);
    if (formRef.current) {
      formRef.current.scrollIntoView({ block: "center", behavior: "auto" });
      const field = formRef.current.querySelector("input");
      if (field) field.focus();
    }
  }, []);

  const join = useCallback(
    (event) => {
      event.preventDefault();
      const entry = {
        plan: wanted,
        email: email.trim(),
        at: new Date().toISOString(),
      };
      try {
        const held = JSON.parse(window.localStorage.getItem(WAITLIST_KEY) || "[]");
        window.localStorage.setItem(
          WAITLIST_KEY,
          JSON.stringify([entry, ...held].slice(0, 20)),
        );
        setNoted({ ...entry, stored: true });
      } catch {
        // Storage refused. The honest outcome is that it was not kept at all,
        // and the confirmation below says exactly that rather than pretending.
        setNoted({ ...entry, stored: false });
      }
    },
    [email, wanted],
  );

  const wantedPlan = PLANS.find((plan) => plan.id === wanted) || PLANS[1];
  const enter = { duration: still ? 0 : DUR.reveal, ease: EASE };

  return (
    <main className="abcost">
      <header className="abcost-head">
        <h1>Free to use. £4.99 to keep.</h1>
        <p className="abcost-lede">
          The talk test and the adaptive ghost are what the app does today, and they
          cost nothing. The paid plans are for keeping the history, and none of them
          can be bought yet: there is no payment integration and no server, so every
          button below writes a note in this browser instead.
        </p>
      </header>

      <section
        className="abcost-rot"
        onMouseDown={onDown}
        onMouseUp={onUp}
        onTouchStart={onDown}
        onTouchEnd={onUp}
        aria-roledescription="carousel"
        aria-label="Plans"
      >
        <div className="abcost-stage">
          {PLANS.map((plan, index) => {
            const half = Math.floor(count / 2);
            const offset = (((index - front + count) % count) + half) % count - half;
            const isFront = offset === 0;
            return (
              <motion.article
                key={plan.id}
                className={isFront ? "abcost-plan is-front" : "abcost-plan"}
                style={{ "--tone": plan.tone, zIndex: isFront ? 3 : 1 }}
                animate={{
                  x: offset * 132,
                  scale: isFront ? 1 : 0.8,
                  rotateY: still ? 0 : offset * -46,
                  opacity: Math.abs(offset) > 1 ? 0 : isFront ? 1 : 0.45,
                }}
                transition={{ duration: still ? 0 : 0.52, ease: EASE }}
                aria-hidden={!isFront}
              >
                {plan.wanted ? (
                  <span className="abcost-flag">The one we would pick</span>
                ) : null}
                <span className="abcost-name">{plan.name}</span>
                <span className="abcost-price">{plan.price}</span>
                <span className="abcost-unit">{plan.unit}</span>
                <span className="abcost-line">{plan.line}</span>
                <ul className="abcost-items">
                  {plan.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </motion.article>
            );
          })}
        </div>

        <div className="abcost-controls">
          <button
            type="button"
            className="abcost-arrow"
            onClick={() => go(-1)}
            aria-label="Previous plan"
          >
            &lsaquo;
          </button>
          <div className="abcost-dots">
            {PLANS.map((plan, index) => (
              <button
                key={plan.id}
                type="button"
                className={index === front ? "abcost-dot is-on" : "abcost-dot"}
                onClick={() => setFront(index)}
                aria-label={plan.name}
                aria-pressed={index === front}
              />
            ))}
          </div>
          <button
            type="button"
            className="abcost-arrow"
            onClick={() => go(1)}
            aria-label="Next plan"
          >
            &rsaquo;
          </button>
        </div>

        {active.id === "free" ? (
          <Link className="abcost-buy" to="/goal" style={{ "--tone": active.tone }}>
            Start a run, it is free today
          </Link>
        ) : (
          <button
            type="button"
            className="abcost-buy"
            style={{ "--tone": active.tone }}
            onClick={() => choose(active.id)}
          >
            Put me on the list for {active.name}
          </button>
        )}
        <p className="abcost-note">
          Nothing here charges you. {active.name} is{" "}
          {active.id === "free"
            ? "what the app already does."
            : "a planned price, not a live one."}
        </p>
      </section>

      <section className="abcost-sec">
        <h2>What each one would actually get you.</h2>
        <p className="abcost-body">
          The left column says whether the thing exists in this build at all. Seven of
          these are working today and free. The rest are not written yet, and saying
          so is cheaper than finding out later.
        </p>

        <div className="abcost-tableWrap">
          <table className="abcost-table">
            <thead>
              <tr>
                <th scope="col" className="abcost-thLabel">
                  Feature
                </th>
                <th scope="col">Free</th>
                <th scope="col">Monthly</th>
                <th scope="col">Year</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label}>
                  <th scope="row" className="abcost-thLabel">
                    <span
                      className={
                        row.state === "Built"
                          ? "abcost-state"
                          : "abcost-state is-off"
                      }
                    >
                      {row.state}
                    </span>
                    {row.label}
                  </th>
                  <td>
                    <Cell value={row.free} />
                  </td>
                  <td>
                    <Cell value={row.monthly} />
                  </td>
                  <td>
                    <Cell value={row.year} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="abcost-sec" ref={formRef}>
        <h2>The list.</h2>
        <p className="abcost-body">
          There is no server, so this is the honest version of a waitlist: what you
          type is written to this browser on this phone and nothing is sent anywhere.
          When there is somewhere to send it, it will ask you again.
        </p>

        <form className="abcost-form" onSubmit={join}>
          <div className="abcost-choose" role="group" aria-label="Which plan">
            {PLANS.filter((plan) => plan.id !== "free").map((plan) => (
              <button
                key={plan.id}
                type="button"
                className={wanted === plan.id ? "abcost-pick is-on" : "abcost-pick"}
                aria-pressed={wanted === plan.id}
                onClick={() => setWanted(plan.id)}
              >
                {plan.name} {plan.price}
              </button>
            ))}
          </div>

          <label className="abcost-formLabel" htmlFor="abcost-email">
            Your email, if you want to give one
          </label>
          <input
            id="abcost-email"
            className="abcost-entry"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <button type="submit" className="abcost-submit">
            Note it down
          </button>
        </form>

        <AnimatePresence initial={false} mode="wait">
          {noted ? (
            <motion.p
              key={noted.at}
              className="abcost-said"
              role="status"
              aria-live="polite"
              initial={{ opacity: 0, y: still ? 0 : 6 }}
              animate={{ opacity: 1, y: 0, transition: enter }}
              exit={{ opacity: 0, transition: exitTransition(DUR.reveal) }}
            >
              {noted.stored
                ? "Written to this browser: " +
                  wantedPlan.name +
                  ", " +
                  wantedPlan.price +
                  ", " +
                  (noted.email ? noted.email : "no email given") +
                  ". It has not been sent anywhere, because there is nowhere to send it."
                : "This browser refused to store it, so nothing was kept and nothing was sent. That is the whole outcome."}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </section>

      <section className="abcost-close">
        <h2>Try it before you think about paying.</h2>
        <div className="abcost-cta">
          <Link className="abcost-go" to="/goal">
            Set up a run
          </Link>
          <Link className="abcost-alt" to="/home">
            Read how it works
          </Link>
        </div>
        <p className="abcost-foot">
          Afterburner was built in a day at RUN/HACK London. There is no payment
          integration, no server and no account: everything runs on your phone. The
          prices above are what we would charge, not what you can pay today. The app
          measures the talk test, which is a coaching method. It is not a lactate
          measurement and not a VO2 test, it does not diagnose or treat anything
          including asthma, and it does not replace a clinician.
        </p>
      </section>
    </main>
  );
}
