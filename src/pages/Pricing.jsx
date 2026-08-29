import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Rotator from "../Rotator.jsx";
import { run } from "../run.js";
import { RULE, plural, summarise } from "../summary.js";
import { useReducedMotion } from "../motion.js";

const WAITLIST_KEY = "afterburner.waitlist";

const SAMPLE = summarise(run.splits);

// Two of these three prices are planned, which means intended and not yet
// charged. There is no checkout in this app and no card is taken anywhere in
// it, so every button on this page goes to the waitlist.
const TIERS = [
  {
    id: "free",
    title: "Free",
    price: "£0",
    badge: "Always free",
    terms: "Free forever. No card, nothing to cancel.",
    items: [
      "Every run, no cap",
      "Pace per kilometre from your spoken markers",
      "Effort per kilometre, as you called it out loud",
      "The flagged kilometres, and the count",
      "Your last 10 runs kept",
    ],
    why: "The count is the whole point of this thing, so it is free forever and no run is ever metered.",
  },
  {
    id: "block",
    title: "Block",
    price: "£24",
    badge: "Recommended",
    terms: "Planned price. One payment, 16 weeks.",
    items: [
      "Everything in Free",
      "Full history for the whole block",
      "Your calibration, run by run",
      "Where inside a run the gap opens",
      "Splits out as CSV",
    ],
    why: "Runners buy in blocks, not months. The paid unit is one training block and it ends when the race does.",
  },
  {
    id: "season",
    title: "Season",
    price: "£39",
    badge: "Whole year",
    terms: "Planned price. One payment, 12 months.",
    items: [
      "Everything in Block, all year",
      "History kept, nothing falls off the back",
      "Block against block",
      "The same route against your past self",
      "One payment, no renewal to cancel",
    ],
    why: "For people who never stop between races. One payment beats two blocks, and there is nothing to cancel.",
  },
];

const ROWS = [
  {
    state: "In this build",
    label: "Pace per kilometre, from the wall clock gap between spoken markers",
    free: "Yes",
    block: "Yes",
    season: "Yes",
  },
  {
    state: "In this build",
    label: "Effort held against the kilometre you called it on",
    free: "Yes",
    block: "Yes",
    season: "Yes",
  },
  {
    state: "In this build",
    label: "Kilometres flagged where effort held or fell while pace slipped",
    free: "Yes",
    block: "Yes",
    season: "Yes",
  },
  {
    state: "In this build",
    label: "The count for a run, taken from your own splits",
    free: "Yes",
    block: "Yes",
    season: "Yes",
  },
  {
    state: "In this build",
    label: "The gap against the ghost of your own first kilometre",
    free: "Yes",
    block: "Yes",
    season: "Yes",
  },
  {
    state: "In this build",
    label:
      "One session shipped with the app to read back, so no screen is ever empty",
    free: "Yes",
    block: "Yes",
    season: "Yes",
  },
  {
    state: "Planned",
    label:
      "Cadence written onto each kilometre. The count runs live today, nothing stores it per kilometre yet",
    free: "Yes",
    block: "Yes",
    season: "Yes",
  },
  {
    state: "Planned",
    label: "How much history is kept",
    free: "Last 10 runs",
    block: "One block, 16 weeks",
    season: "Kept, nothing falls off",
  },
  {
    state: "Planned",
    label: "Your calibration across runs, not just inside one",
    free: "No",
    block: "Yes",
    season: "Yes",
  },
  {
    state: "Planned",
    label: "Where inside a run the gap opens",
    free: "No",
    block: "Yes",
    season: "Yes",
  },
  {
    state: "Planned",
    label: "Splits exported as CSV",
    free: "No",
    block: "Yes",
    season: "Yes",
  },
  {
    state: "Planned",
    label: "Block against block, and a route against your past self",
    free: "No",
    block: "No",
    season: "Yes",
  },
  {
    state: "Not started",
    label: "A coach view across several runners",
    free: "No",
    block: "No",
    season: "No",
  },
];

const QUESTIONS = [
  {
    q: "What happens when I join the waitlist?",
    a: "The address is kept in this browser, on this device. There is no server behind this page, so nothing is sent anywhere and nobody is emailed by joining.",
  },
  {
    q: "When am I asked to pay?",
    a: "Not here. There is no checkout anywhere in this app and no card is taken. Both paid numbers are planned prices, which means intended and not yet charged.",
  },
  {
    q: "Does Free get worse once the paid tiers exist?",
    a: "No. Every run, every kilometre and the count itself stay free, with your last 10 runs kept. The paid tiers sell the history, never the accusation.",
  },
  {
    q: "What if I stop running?",
    a: "Block is one payment for 16 weeks and Season is one payment for 12 months. Neither renews, so stopping costs nothing and there is no cancellation to remember.",
  },
];

export default function Pricing() {
  const [index, setIndex] = useState(1);
  const [said, setSaid] = useState("");
  const emailRef = useRef(null);
  const still = useReducedMotion();

  const goWaitlist = useCallback(() => {
    const field = emailRef.current;
    if (!field) return;
    field.scrollIntoView({
      behavior: still ? "auto" : "smooth",
      block: "center",
    });
    field.focus({ preventScroll: true });
  }, [still]);

  const submit = (event) => {
    event.preventDefault();
    const value = emailRef.current ? emailRef.current.value.trim() : "";
    if (!value) {
      setSaid("Put an address in the box first.");
      return;
    }
    try {
      window.localStorage.setItem(WAITLIST_KEY, value);
      setSaid(
        "Kept in this browser, on this device. Nothing was sent anywhere, and nothing on this page can be bought yet.",
      );
    } catch {
      setSaid(
        "This browser refused to store it, so nothing was saved. Nothing on this page can be bought yet either.",
      );
    }
  };

  const front = TIERS[index];

  return (
    <main className="ab-page">
      <header className="ab-hero">
        <div className="ab-wrap">
          <h1 className="ab-h1">
            Pay for how long you need it, not by the month.
          </h1>
          <p className="ab-lede">
            Every run is free forever, including the number that catches you
            out.{" "}
            <strong>
              One run of counts is noise. Forty runs is a measurement.
            </strong>{" "}
            The only thing worth charging for is keeping the record.
          </p>

          <Rotator
            items={TIERS}
            index={index}
            onIndex={setIndex}
            label="Three plans, one shown at a time. Use the left and right arrow keys."
            type="TIMES YOU LIED"
            card={(tier, isFront) => (
              <article className={isFront ? "ab-card ab-card-front" : "ab-card"}>
                <div className="ab-card-head">
                  <h2 className="ab-h3">{tier.title}</h2>
                  <span
                    className={
                      tier.id === "block"
                        ? "ab-card-badge ab-card-badge-pick"
                        : "ab-card-badge"
                    }
                  >
                    {tier.badge}
                  </span>
                </div>
                <p className="ab-card-price">{tier.price}</p>
                <p className="ab-card-terms">{tier.terms}</p>
                <ul className="ab-card-list">
                  {tier.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p className="ab-card-foot">{tier.why}</p>
              </article>
            )}
          >
            <div className="ab-pill-row">
              <button
                className="ab-btn ab-btn-solid"
                type="button"
                onClick={goWaitlist}
              >
                Join the waitlist for {front.title}
              </button>
              <p className="ab-pill-note">
                {front.id === "free"
                  ? "Free forever. There is nothing to pay here and nothing to cancel."
                  : front.price +
                    " is a planned price. There is no checkout in this app."}
              </p>
            </div>
          </Rotator>
        </div>
      </header>

      <section className="ab-sec">
        <div className="ab-wrap">
          <h2 className="ab-h2">What runs today, and what does not</h2>
          <p className="ab-p">
            Rows marked in this build run right now, on the session that ships
            with the app. Rows marked planned do not exist yet, and they are
            listed so that no price is sold on them.
          </p>

          <div className="ab-rows">
            <div className="ab-thead" aria-hidden="true">
              <span>Capability</span>
              <span>Free</span>
              <span>Block</span>
              <span>Season</span>
            </div>
            {ROWS.map((row) => {
              const stateClass =
                row.state === "In this build"
                  ? "ab-row-state"
                  : row.state === "Planned"
                    ? "ab-row-state ab-row-state-planned"
                    : "ab-row-state ab-row-state-none";
              const cells = [
                { key: "Free", value: row.free },
                { key: "Block", value: row.block },
                { key: "Season", value: row.season },
              ];
              return (
                <div className="ab-row" key={row.label}>
                  <div className="ab-row-main">
                    <span className={stateClass}>{row.state}</span>
                    <p className="ab-row-label">{row.label}</p>
                  </div>
                  <div className="ab-cells">
                    {cells.map((cell) => (
                      <div key={cell.key}>
                        <span className="ab-cell-label">{cell.key}</span>
                        <span
                          className={cell.value === "No" ? "ab-cell-no" : ""}
                        >
                          {cell.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {SAMPLE.kms > 1 ? (
            <p className="ab-note">
              The only number on this page that is not a price: run that rule
              over the session that ships with this app,{" "}
              <strong>{run.distance}</strong> spoken on the track, and it flags{" "}
              {plural(SAMPLE.count, "kilometre", "kilometres")} out of{" "}
              {SAMPLE.kms}
              {SAMPLE.count ? ", at " + SAMPLE.flagList : ""}. {RULE} That is
              one session and not a study, and none of it is advice about your
              training or your health.
            </p>
          ) : null}
        </div>
      </section>

      <section className="ab-sec">
        <div className="ab-wrap">
          <h2 className="ab-h2">After the waitlist</h2>
          <p className="ab-p">
            Four questions worth answering before you hand over an address.
          </p>
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

      <section className="ab-sec" id="waitlist">
        <div className="ab-wrap ab-wrap-narrow">
          <h2 className="ab-h2">Join the waitlist</h2>
          <p className="ab-p">
            Nothing on this page is purchasable. Both paid prices are planned,
            there is no payment built, and no card is taken anywhere in this
            app.
          </p>
          <form className="ab-form" onSubmit={submit}>
            <div className="ab-field">
              <label className="ab-label" htmlFor="pricing-email">
                Email
              </label>
              <input
                className="ab-input"
                id="pricing-email"
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
          <div className="ab-actions">
            <Link className="ab-btn ab-btn-ghost" to="/run">
              Open the run view
            </Link>
            <Link className="ab-btn ab-btn-ghost" to="/sessions">
              Open the session log
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
