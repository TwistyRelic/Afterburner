import { Link } from "react-router-dom";
import SessionFeed from "../SessionFeed.jsx";

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
      <SessionFeed logged={logged} onLog={onLog} />

      <footer>
        Built at RUN/HACK London — voice on the track, Devin on the repo.
      </footer>
    </main>
  );
}
