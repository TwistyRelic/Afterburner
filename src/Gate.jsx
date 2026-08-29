import { useState } from "react";
import { motion } from "framer-motion";

export default function Gate({ onEnter }) {
  const [mode, setMode] = useState("choose");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (event) => {
    event.preventDefault();
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 4) {
      setError("Password needs at least 4 characters.");
      return;
    }
    onEnter({ kind: "athlete", name: value.split("@")[0] });
  };

  return (
    <motion.section
      className="gate"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <h2>Who&apos;s training?</h2>

      {mode === "choose" ? (
        <div className="gate-actions">
          <motion.button
            type="button"
            className="primary"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setMode("login")}
          >
            Log in
          </motion.button>
          <motion.button
            type="button"
            className="ghost"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onEnter({ kind: "visitor", name: "Visitor" })}
          >
            Continue as visitor
          </motion.button>
        </div>
      ) : (
        <form className="gate-form" onSubmit={handleLogin} noValidate>
          <label className="sr-only" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <label className="sr-only" htmlFor="login-password">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <div className="gate-actions">
            <motion.button
              type="submit"
              className="primary"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Log in
            </motion.button>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setMode("choose");
                setError("");
              }}
            >
              Back
            </button>
          </div>
          <p className="gate-error" role="status">
            {error}
          </p>
        </form>
      )}

      <p className="gate-note">
        No accounts yet — login is local to this browser session.
      </p>
    </motion.section>
  );
}
