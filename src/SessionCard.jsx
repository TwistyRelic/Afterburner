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
        <span className="number">{session.number}</span>
      </div>
      <p className="note">{session.note}</p>
      <div className="coach">
        <span className="coach-label">Coach reply</span>
        <p className="coach-text">{session.coach}</p>
        <p className="markers">Suggested Healf markers: {session.markers}.</p>
      </div>
    </motion.article>
  );
}
