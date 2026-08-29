import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { run } from "../run.js";
import {
  RULE,
  paceLabel,
  plural,
  spanLabel,
  summarise,
} from "../summary.js";
import { DUR, EASE, useCountUp, useReducedMotion } from "../motion.js";

const SAMPLE = summarise(run.splits);

// Every sentence below that carries a number builds it from the session in
// run.js. Nothing here is typed in by hand.
const MEASURES = [
  {
    id: "pace",
    title: "Pace per kilometre, with nothing strapped to you",
    body: "Call the kilometre out loud as you pass it. The split is the wall clock gap between two spoken markers, so the whole kit is a phone in your pocket. No watch, no chest strap, no screen to look at while you run.",
    state: "In this build",
    read:
      SAMPLE.first && SAMPLE.last
        ? "Kilometre " +
          SAMPLE.first.km +
          " came in at " +
          paceLabel(SAMPLE.first.pace) +
          " and kilometre " +
          SAMPLE.last.km +
          " at " +
          paceLabel(SAMPLE.last.pace) +
          "."
        : null,
  },
  {
    id: "effort",
    title: "Effort recorded where it happened",
    body: "You call a number out of ten on the kilometre it belongs to. It is stored against that kilometre and never edited afterwards, because hindsight is the thing being measured.",
    state: "In this build",
    read:
      SAMPLE.first && SAMPLE.last
        ? "Effort went " +
          SAMPLE.first.effort +
          " to " +
          SAMPLE.last.effort +
          " while the split went " +
          paceLabel(SAMPLE.first.pace) +
          " to " +
          paceLabel(SAMPLE.last.pace) +
          "."
        : null,
  },
  {
    id: "rule",
    title: "One rule, and you can argue with it",
    body: RULE,
    state: "In this build",
    read: SAMPLE.count
      ? plural(SAMPLE.count, "kilometre", "kilometres") +
        " flagged in the session below, at " +
        SAMPLE.flagList +
        "."
      : "Nothing in the session below is flagged.",
  },
  {
    id: "ghost",
    title: "The ghost of kilometre one",
    body: "Your first kilometre keeps running at its own pace for the rest of the session. Every kilometre after it is shown against that ghost, in seconds a kilometre and in the time you have handed over.",
    state: "In this build",
    read:
      SAMPLE.behind > 0
        ? "By the finish the run is " +
          spanLabel(SAMPLE.behind) +
          " behind its own first kilometre."
        : null,
  },
  {
    id: "cadence",
    title: "Cadence from the phone in your pocket",
    body: "Steps per minute counted off the phone as you run, so legs that stop turning over show up next to the kilometre it happened on. Nothing to strap on for this one either.",
    state: "Counts live, not stored per kilometre yet",
    soon: true,
    read:
      SAMPLE.first && SAMPLE.last && SAMPLE.first.cadence && SAMPLE.last.cadence
        ? "The count runs while you run. The per kilometre figures below, " +
          SAMPLE.first.cadence +
          " down to " +
          SAMPLE.last.cadence +
          " steps a minute, came recorded with the session: this build does not yet write a cadence onto each kilometre as you pass it."
        : "The count runs while you run. This build does not yet write a cadence onto each kilometre as you pass it.",
  },
  {
    id: "count",
    title: "Times you lied",
    body: "One count per run, taken from your own splits. It is the headline of a session, and the app calls it what it is.",
    state: "In this build",
    read:
      "The session below returns " +
      plural(SAMPLE.count, "flagged kilometre", "flagged kilometres") +
      " out of " +
      SAMPLE.kms +
      ".",
  },
];

export default function Features() {
  const [index, setIndex] = useState(0);
  const [painted, setPainted] = useState(false);
  const still = useReducedMotion();

  const total = SAMPLE.rows.length;
  const split = SAMPLE.rows[index] || null;
  const flag = split
    ? SAMPLE.flags.find((item) => item.km === split.km) || null
    : null;
  const ghostPerKm =
    split && SAMPLE.first ? split.pace - SAMPLE.first.pace : 0;

  // The split rolls when the reader steps to another kilometre. It is settled
  // on first paint and only ever moves because somebody asked it to.
  const rolled = useCountUp(split ? split.pace : 0, { format: paceLabel });

  const step = (delta) => {
    if (!total) return;
    setPainted(true);
    setIndex((current) => Math.min(total - 1, Math.max(0, current + delta)));
  };

  return (
    <main className="ab-page">
      <header className="ab-hero">
        <div className="ab-wrap ab-wrap-narrow">
          <h1 className="ab-h1">You talk. It checks.</h1>
          <p className="ab-lede">
            You tap once and call your kilometres and your effort out loud while
            you run. Afterburner holds what you said against the clock.{" "}
            <strong>The product is the gap between the two.</strong>
          </p>
        </div>
      </header>

      <div className="ab-wrap ab-wrap-narrow">
        {MEASURES.map((measure) => (
          <section className="ab-sec ab-sec-tight" key={measure.id}>
            <h2 className="ab-h3">{measure.title}</h2>
            <p className="ab-p">{measure.body}</p>
            <span
              className={
                measure.soon ? "ab-kicker ab-kicker-quiet" : "ab-kicker"
              }
            >
              {measure.state}
            </span>
            {measure.read ? <p className="ab-read">{measure.read}</p> : null}
          </section>
        ))}

        <section className="ab-sec">
          <h2 className="ab-h2">Read it on the session in the app</h2>
          <p className="ab-p">
            One session, recorded on the track, included so that no screen in
            the app is ever empty. Walk it a kilometre at a time with the arrows
            or the arrow keys. One session is not a study, and none of it is
            advice.
          </p>

          {split ? (
            <div className="ab-figure">
              <motion.div
                key={split.km}
                initial={painted && !still ? { opacity: 0, y: 10 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: still ? 0 : DUR.reveal, ease: EASE }}
                aria-live="polite"
              >
                <span className="ab-kicker">
                  Kilometre {split.km} of {total}
                </span>

                <p className="ab-card-price">
                  <span ref={rolled.ref}>{rolled.text}</span>
                </p>
                <p className="ab-card-terms">
                  Measured split, seconds per kilometre
                </p>

                <div className="ab-rows">
                  <div className="ab-row">
                    <span className="ab-cell-label">Effort you called</span>
                    <span>{split.effort} out of 10</span>
                  </div>
                  <div className="ab-row">
                    <span className="ab-cell-label">Cadence</span>
                    <span>
                      {split.cadence
                        ? split.cadence +
                          " steps a minute, recorded with the session"
                        : "Not counted on this kilometre"}
                    </span>
                  </div>
                  <div className="ab-row">
                    <span className="ab-cell-label">
                      Against the ghost of km 1
                    </span>
                    <span>
                      {ghostPerKm === 0
                        ? "Level with it"
                        : Math.abs(ghostPerKm) +
                          " seconds a kilometre " +
                          (ghostPerKm > 0 ? "behind" : "ahead")}
                    </span>
                  </div>
                  <div className="ab-row">
                    <span className="ab-cell-label">Flag</span>
                    <span className={flag ? "ab-row-state" : "ab-cell-no"}>
                      {flag
                        ? (flag.kind === "form-collapse"
                            ? "Form collapse. "
                            : "Slowing. ") +
                          flag.paceSlip +
                          " seconds a kilometre slower than the kilometres before it, still called " +
                          flag.effort +
                          " out of ten, cadence down " +
                          flag.cadenceDrop +
                          " steps a minute."
                        : "Not flagged."}
                    </span>
                  </div>
                </div>
              </motion.div>

              <div className="ab-controls">
                <button
                  className="ab-arrow"
                  type="button"
                  onClick={() => step(-1)}
                  disabled={index === 0}
                  aria-label="Previous kilometre"
                >
                  {"<"}
                </button>
                <span className="ab-count">
                  {index + 1} of {total}
                </span>
                <button
                  className="ab-arrow"
                  type="button"
                  onClick={() => step(1)}
                  disabled={index === total - 1}
                  aria-label="Next kilometre"
                >
                  {">"}
                </button>
              </div>
            </div>
          ) : (
            <p className="ab-read">
              There is no session in this build to read yet. Record one and it
              appears here.
            </p>
          )}

          {SAMPLE.score === null ? null : (
            <p className="ab-note">
              <strong>
                {"That session scores " +
                  SAMPLE.score +
                  " for calibration and still holds " +
                  plural(
                    SAMPLE.count,
                    "flagged kilometre",
                    "flagged kilometres",
                  ) +
                  "."}
              </strong>{" "}
              The score reads how closely the effort called out loud moved with
              the pace actually run, across the whole session. A flag is one
              kilometre. A run can track well overall and still hold the
              kilometre where you stopped telling the truth, which is the one
              worth looking at. It is a reading of one session and it predicts
              nothing.
            </p>
          )}
        </section>

        <section className="ab-sec">
          <h2 className="ab-h2">What it does not do</h2>
          <p className="ab-p">
            It does not diagnose anything. It does not tell you that you are
            injured, run down or overtrained, it does not suggest a test of any
            kind, and it does not tell you what to run tomorrow. It measures
            what you said against what you did, and it stops there.
          </p>
          <p className="ab-p">
            Nothing in this app can be bought. There is no payment built into it
            and no card is taken anywhere in it.
          </p>
          <div className="ab-actions">
            <Link className="ab-btn ab-btn-solid" to="/run">
              Start a run
            </Link>
            <Link className="ab-btn ab-btn-ghost" to="/sessions">
              Read a session back
            </Link>
          </div>
          <p className="ab-note">
            {"Every number on this page is computed from that session, " +
              plural(SAMPLE.kms, "spoken kilometre", "spoken kilometres") +
              ". None of it is typed in by hand, so it moves when the session does."}
          </p>
        </section>
      </div>
    </main>
  );
}
