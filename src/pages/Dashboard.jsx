import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useBreath } from "../useBreath.js";

const EASE = [0.16, 1, 0.3, 1];

const CARDS = [
  {
    to: "/breath",
    kicker: "Talk test",
    title: "How hard are you actually working?",
    body: "Read one sentence out loud. Twelve seconds, and you get the zone you are really in.",
    tone: "#3AA0FF",
  },
  {
    to: "/goal",
    kicker: "Adaptive ghost",
    title: "Race a ghost that listens",
    body: "Set a goal. The ghost re-paces itself around your breathing instead of holding a number you cannot hold.",
    tone: "#FF4D2D",
  },
  {
    to: "/sessions",
    kicker: "Log",
    title: "Every session you have recorded",
    body: "Splits, flags and how your zones moved over time.",
    tone: "#4FD1A5",
  },
];

export default function Dashboard() {
  const { history } = useBreath();
  const last = history[0] ?? null;

  return (
    <div className="dash">
      <motion.header
        className="dash-head"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
      >
        <p className="dash-kicker">Afterburner</p>
        <h1>What are we doing today?</h1>
      </motion.header>

      {last && last.zone && (
        <motion.div
          className="dash-last"
          style={{ "--zone": last.zone.colour }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE, delay: 0.06 }}
        >
          <span className="plate-label">Last reading</span>
          <span className="dash-zone">{last.zone.name}</span>
          <span className="plate-note">{last.phraseLength}s between breaths</span>
        </motion.div>
      )}

      <div className="dash-cards">
        {CARDS.map((card, i) => (
          <motion.div
            key={card.to}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.1 + i * 0.06 }}
          >
            <Link to={card.to} className="dash-card" style={{ "--tone": card.tone }}>
              <span className="dash-card-kicker">{card.kicker}</span>
              <span className="dash-card-title">{card.title}</span>
              <span className="dash-card-body">{card.body}</span>
              <span className="dash-card-go" aria-hidden="true">Open</span>
            </Link>
          </motion.div>
        ))}
      </div>

      <p className="honest-note">
        Everything runs on this phone. No account is created, no audio is recorded, and
        nothing you say leaves the device.
      </p>
    </div>
  );
}
