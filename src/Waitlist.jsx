import { useEffect, useState } from "react";
import {
  addEmail,
  countLine,
  readWaitlist,
  writeWaitlist,
} from "./waitlist.js";

const storage = () =>
  typeof window === "undefined" ? null : window.localStorage;

export default function Waitlist() {
  const [emails, setEmails] = useState([]);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    setEmails(readWaitlist(storage()));
  }, []);

  const submit = (event) => {
    event.preventDefault();
    const result = addEmail(emails, email);
    if (!result.added) {
      setStatus(
        result.reason === "duplicate"
          ? "Already on the list."
          : "That does not look like an email.",
      );
      return;
    }
    setEmails(result.emails);
    setEmail("");
    setStatus(
      writeWaitlist(storage(), result.emails)
        ? "On the list."
        : "On the list, but this browser would not save it.",
    );
  };

  const copyAll = async () => {
    const text = emails.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setStatus(
        `Copied ${emails.length} ${emails.length === 1 ? "email" : "emails"}.`,
      );
    } catch {
      setStatus("Clipboard blocked — the addresses are listed below.");
    }
  };

  return (
    <section className="waitlist" aria-labelledby="waitlist-heading">
      <h2 className="waitlist-heading" id="waitlist-heading">
        Waitlist
      </h2>
      <p className="waitlist-count" role="status">
        {countLine(emails.length)}
      </p>

      <form className="waitlist-form" onSubmit={submit}>
        <label className="sr-only" htmlFor="waitlist-email">
          Email
        </label>
        <input
          id="waitlist-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <button className="button" type="submit">
          Join the waitlist
        </button>
      </form>

      <div className="waitlist-tools">
        <button
          className="button ghost small"
          type="button"
          disabled={emails.length === 0}
          onClick={copyAll}
        >
          Copy all emails
        </button>
        {status ? <span className="waitlist-status">{status}</span> : null}
      </div>

      {emails.length > 0 && (
        <ul className="waitlist-emails">
          {emails.map((entry) => (
            <li key={entry}>{entry}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
