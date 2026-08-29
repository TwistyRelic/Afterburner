import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1];

const FEATURES = [
  {
    id: "talk",
    tint: "#E8F1FF",
    ink: "#1B4C86",
    kicker: "The sensor",
    title: "The talk test",
    lead: "Read one sentence. Twelve seconds. That is the whole input.",
    detail:
      "How long you can speak between breaths tracks how hard you are working. Coaches have used it by ear for decades. We measure it from raw microphone energy: seconds of continuous speech, how often you breathe, and how much of the sample is silence.",
    numbers: [
      ["12 s", "one sample"],
      ["4", "numbers measured"],
      ["0", "wearables needed"],
    ],
  },
  {
    id: "zone",
    tint: "#E6F7F0",
    ink: "#166A4E",
    kicker: "The read",
    title: "Five zones, and what to do in each",
    lead: "Full sentences means easy. Four words at a time means you are over the line.",
    detail:
      "The guidance changes with what today was meant to be. Land in zone four on an easy run and it says so, and tells you to ease off until a full sentence comes back. Land in zone two on a threshold day and it tells you there is room.",
    numbers: [
      ["1 to 5", "zones"],
      ["3", "session intents"],
    ],
  },
  {
    id: "ghost",
    tint: "#FFEDE7",
    ink: "#B23A18",
    kicker: "The act",
    title: "A ghost that re-paces itself",
    lead: "Every other pacer holds the number you typed in while you come apart.",
    detail:
      "Set a distance and a goal time. The ghost starts at the pace that implies, then every reading moves it: too hard for today and it eases, and states the honest new finish. Every adjustment is bounded, so one noisy reading cannot swing your pace.",
    numbers: [
      ["min/km", "you set it"],
      ["bounded", "per adjustment"],
    ],
  },
  {
    id: "score",
    tint: "#F4EEFF",
    ink: "#5B3A9E",
    kicker: "The report",
    title: "One score, and the fix",
    lead: "Control and efficiency, out of a hundred, from your own numbers.",
    detail:
      "Each technique names the number that triggered it. Thirty four breaths a minute gets you the one about lengthening the out breath. Under 1.6 seconds between breaths gets you the three two rhythm. Nothing generic, nothing invented.",
    numbers: [
      ["/100", "one headline"],
      ["3", "techniques, max"],
    ],
  },
];

export default function Features() {
  const [open, setOpen] = useState(null);

  return (
    <div className="ft">
      <motion.header
        className="ft-head"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE }}
      >
        <h1>What it actually does</h1>
        <p>Four things. Tap any of them.</p>
      </motion.header>

      <div className="ft-list">
        {FEATURES.map((f, i) => {
          const isOpen = open === f.id;
          return (
            <motion.article
              key={f.id}
              className={isOpen ? "ft-card open" : "ft-card"}
              style={{ "--tint": f.tint, "--fink": f.ink }}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.55, ease: EASE, delay: i * 0.06 }}
            >
              <button
                type="button"
                className="ft-top"
                onClick={() => setOpen(isOpen ? null : f.id)}
                aria-expanded={isOpen}
              >
                <span className="ft-left">
                  <span className="ft-kicker">{f.kicker}</span>
                  <span className="ft-title">{f.title}</span>
                  <span className="ft-lead">{f.lead}</span>
                </span>
                <span className="ft-right" aria-hidden="true">
                  <span className={isOpen ? "ft-chev up" : "ft-chev"}>›</span>
                </span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    className="ft-body"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: EASE }}
                  >
                    <div className="ft-split">
                      <p className="ft-detail">{f.detail}</p>
                      <div className="ft-numbers">
                        {f.numbers.map(([big, small]) => (
                          <div key={small}>
                            <span className="ft-big">{big}</span>
                            <span className="ft-small">{small}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.article>
          );
        })}
      </div>

      <p className="honest-note">
        The talk test is a coaching method. It is not a lactate test, not VO2 max, and it
        diagnoses nothing. Nothing is recorded and no audio leaves your phone.
      </p>
    </div>
  );
}
