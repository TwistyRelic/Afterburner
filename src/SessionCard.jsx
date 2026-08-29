import { motion } from "framer-motion";
import { coachReply } from "./coach.js";
import { EASE } from "./motion.js";

// Two changes from the version this replaces, both required rather than
// cosmetic. The card used whileInView, which does not fire in a headless
// browser and ships the whole log blank; it now paints at its settled state on
// first render and only moves under a pointer. And it printed a line of
// suggested blood markers under every session, which is a medical
// recommendation this product does not make.
export default function SessionCard({ session }) {
  const reply = coachReply(session);

  return (
    <motion.article
      className="session"
      initial={false}
      whileHover={{ y: -3, borderColor: "#ff4d2d" }}
      transition={{ duration: 0.2, ease: EASE }}
    >
      <div className="session-head">
        <span className="name">{session.name}</span>
        <span className="time">{session.time}</span>
        {session.number ? (
          <span className="number">{session.number}</span>
        ) : null}
      </div>
      <p className="note">{session.note}</p>
      {session.gap ? (
        <div className="gap">
          <div className="gap-row">
            <span className="gap-label">Said</span>
            <span className="gap-value">{session.gap.said}</span>
          </div>
          <div className="gap-row">
            <span className="gap-label">Measured</span>
            <span className="gap-value">{session.gap.measured}</span>
          </div>
          <div className="gap-row">
            <span className="gap-label">Gap</span>
            <span className="gap-value gap-delta">{session.gap.delta}</span>
          </div>
        </div>
      ) : null}
      {reply ? (
        <div className="coach">
          <span className="coach-label">What the rule read</span>
          <p className="coach-text">{reply.text}</p>
          <dl className="coach-sources">
            {reply.sources.map((source) => (
              <div className="coach-source" key={source.label}>
                <dt>{source.label}</dt>
                <dd>{source.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </motion.article>
  );
}
