import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useBreath } from "../useBreath.js";
import { bandFor, breathingScore, compare, controlScore, efficiencyScore, techniquesFor } from "../analysis.js";

const EASE = [0.16, 1, 0.3, 1];

export default function Analysis() {
  const { history } = useBreath();
  const current = history[0] ?? null;
  const previous = history[1] ?? null;

  if (!current) {
    return (
      <div className="analysis">
        <h1>Nothing to analyse yet</h1>
        <p className="breath-sub">
          Take a talk test and the analysis appears here. It takes twelve seconds.
        </p>
        <Link to="/breath" className="ghost wide analysis-cta">
          Take a talk test
        </Link>
      </div>
    );
  }

  const score = breathingScore(current);
  const band = bandFor(score);
  const control = controlScore(current);
  const efficiency = efficiencyScore(current);
  const techniques = techniquesFor(current, current.zone);
  const change = compare(previous, current);

  return (
    <div className="analysis">
      <motion.div
        className="score-ring"
        style={{ "--band": band.colour }}
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <span className="score-number">{score}</span>
        <span className="score-of">out of 100</span>
        <span className="score-band">{band.label}</span>
      </motion.div>

      {change && <p className="change-line">{change.line}</p>}

      <div className="score-split">
        <div>
          <span className="metric-value">{control}</span>
          <span className="metric-label">Control, how steady it was</span>
        </div>
        <div>
          <span className="metric-value">{efficiency}</span>
          <span className="metric-label">Efficiency, speech per breath</span>
        </div>
      </div>

      {techniques.length > 0 && (
        <section className="techniques">
          <h2>What to change</h2>
          {techniques.map((t, i) => (
            <motion.article
              key={t.title}
              className="technique"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: EASE, delay: 0.08 + i * 0.06 }}
            >
              <h3>{t.title}</h3>
              <p className="technique-why">{t.why}</p>
              <p className="technique-how">{t.how}</p>
            </motion.article>
          ))}
        </section>
      )}

      <div className="analysis-actions">
        <Link to="/breath" className="ghost wide">Take another reading</Link>
        <Link to="/pace" className="ghost wide">Take it to the ghost</Link>
      </div>

      <p className="honest-note">
        Every number here is computed from your own talk test. The techniques are standard
        running coaching, not medical advice. If you have a breathing condition, follow
        your own clinician rather than this app.
      </p>
    </div>
  );
}
