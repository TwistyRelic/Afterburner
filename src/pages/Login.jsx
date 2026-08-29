import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function Login({ onEnter }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const enter = (user) => {
    onEnter(user);
    navigate("/sessions");
  };

  const handleSubmit = (event) => {
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
    enter({ kind: "athlete", name: value.split("@")[0] });
  };

  return (
    <main className="narrow">
      <h1 className="page-title">Log in</h1>
      <p className="tagline">Pick up where the last session left off.</p>

      <motion.form
        className="card gate-form"
        onSubmit={handleSubmit}
        noValidate
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          type="password"
          placeholder="At least 4 characters"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <motion.button
          type="submit"
          className="primary block"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Log in
        </motion.button>
        <p className="gate-error" role="status">
          {error}
        </p>
      </motion.form>

      <div className="login-alt">
        <button
          type="button"
          className="ghost block"
          onClick={() => enter({ kind: "visitor", name: "Visitor" })}
        >
          Continue as visitor
        </button>
        <Link className="quiet-link" to="/">
          Back to home
        </Link>
      </div>

      <p className="gate-note">
        No accounts yet — login is local to this browser session.
      </p>
    </main>
  );
}
