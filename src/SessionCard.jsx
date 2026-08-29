import { motion } from "framer-motion";

export default function SessionCard({ session, index }) {
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
      {session.coach ? (
        <div className="coach">
          <span className="coach-label">Coach reply</span>
          <p className="coach-text">{session.coach}</p>
          <p className="markers">Suggested Healf markers: {session.markers}.</p>
        </div>
      ) : null}
    </motion.article>
  );
}
