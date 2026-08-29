import { motion } from "framer-motion";
import CoachVoice from "./CoachVoice.jsx";
import { coachReply } from "./coach.js";

export default function SessionCard({ session, index, speak = false }) {
  const reply = coachReply(session);

  return (
    <motion.article
      className="session"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.45, delay: index * 0.08, ease: "easeOut" }}
      whileHover={{ y: -3, borderColor: "#ff5c30" }}
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
          <span className="coach-label">Coach reply</span>
          <CoachVoice text={reply.text} speak={speak} />
          <dl className="coach-sources">
            {reply.sources.map((source) => (
              <div className="coach-source" key={source.label}>
                <dt>{source.label}</dt>
                <dd>{source.value}</dd>
              </div>
            ))}
          </dl>
          <p className="markers">Suggested Healf markers: {session.markers}.</p>
        </div>
      ) : null}
    </motion.article>
  );
}
