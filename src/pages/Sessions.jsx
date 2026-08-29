import { Link } from "react-router-dom";
import LogNote from "../LogNote.jsx";
import SessionCard from "../SessionCard.jsx";
import Waitlist from "../Waitlist.jsx";
import { sessions } from "../sessions.js";

export default function Sessions({ user, logged, onLog, onSignOut }) {
  const identity = user ?? { kind: "visitor", name: "Visitor" };

  return (
    <main>
      <div className="signed-in">
        <span>
          {identity.kind === "visitor"
            ? "Browsing as visitor"
            : `Signed in as ${identity.name}`}
        </span>
        {identity.kind === "visitor" ? (
          <Link className="button ghost small" to="/login">
            Log in
          </Link>
        ) : (
          <Link className="button ghost small" to="/" onClick={onSignOut}>
            Sign out
          </Link>
        )}
      </div>

      <h1 className="page-title">Sessions</h1>
      <LogNote onLog={onLog} />

      {[...logged, ...sessions].map((session, index) => (
        <SessionCard
          key={session.id ?? session.name}
          session={session}
          index={index}
        />
      ))}

      <h2>Waitlist</h2>
      <Waitlist />

      <footer>
        Built at RUN/HACK London — voice on the track, Devin on the repo.
      </footer>
    </main>
  );
}
