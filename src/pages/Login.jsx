import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1];
const KEY = "afterburner.account";

const POINTS = [
  "Your zone in twelve seconds, from one sentence read out loud",
  "A ghost that re-paces itself to what you can hold today",
  "A breathing score, and the one technique that moves it",
  "No watch, no chest strap, no subscription",
];

export default function Login() {
  const navigate = useNavigate();
  const [name, setName] = useState("");

  const submit = (event) => {
    event.preventDefault();
    const value = name.trim();
    if (!value) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ name: value, units: "km" }));
      // A new account starts genuinely empty. Nothing is seeded, so the first
      // number a person sees is one they produced themselves.
      window.localStorage.setItem("afterburner.runs", "[]");
      window.localStorage.setItem("afterburner.readings", "[]");
      window.localStorage.setItem("afterburner.fresh", "1");
    } catch {
      /* storage unavailable, the session still works */
    }
    navigate("/dashboard");
  };

  return (
    <div className="gate">
      <motion.section
        className="gate-pitch"
        initial={{ opacity: 0, x: -18 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55, ease: EASE }}
      >
        <h2>A pacer that listens to you breathe.</h2>
        <p>
          Every other pacer holds the number you typed in while you come apart. This one
          hears where you breathe and moves.
        </p>
        <div className="gate-points">
          {POINTS.map((point, i) => (
            <motion.div
              className="gate-point"
              key={point}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: EASE, delay: 0.15 + i * 0.07 }}
            >
              <span className="gate-dot" aria-hidden="true" />
              <span>{point}</span>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <motion.section
        className="gate-form"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE, delay: 0.1 }}
      >
        <h1>Get started</h1>
        <p className="gate-note">
          There is no password and no email. Pick a name and the app opens. Everything is
          stored on this phone.
        </p>

        <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
          <label>
            What should we call you?
            <input
              type="text"
              value={name}
              placeholder="Your name"
              autoComplete="given-name"
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <button type="submit" className="gate-submit">
            Open the app
          </button>
        </form>

        <p className="gate-note">
          No account is created on any server. Nothing you record leaves this device, and
          deleting your browser data removes all of it.
        </p>
      </motion.section>
    </div>
  );
}
