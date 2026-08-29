import { useState } from "react";
import { motion } from "framer-motion";

export default function Waitlist() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setStatus("Enter a valid email address.");
      return;
    }
    setStatus(`Thanks — ${value} is on the list.`);
    setEmail("");
  };

  return (
    <>
      <form className="waitlist" onSubmit={handleSubmit} noValidate>
        <label className="sr-only" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <motion.button
          type="submit"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
        >
          Join waitlist
        </motion.button>
      </form>
      <motion.p
        className="waitlist-status"
        role="status"
        key={status}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        {status}
      </motion.p>
    </>
  );
}
