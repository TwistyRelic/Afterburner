import { useState } from "react";
import { motion } from "framer-motion";

export default function LogNote({ onLog }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    const note = text.trim();
    if (!note) {
      setError("Say something about the session first.");
      return;
    }
    onLog(note);
    setText("");
    setError("");
  };

  return (
    <form className="log-note" onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor="log-note-input">
        Session note
      </label>
      <input
        id="log-note-input"
        placeholder="How did that feel?"
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <motion.button
        type="submit"
        className="primary"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        Log note
      </motion.button>
      <p className="log-note-error" role="status">
        {error}
      </p>
    </form>
  );
}
