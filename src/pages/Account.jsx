import { Link } from "react-router-dom";
import { useRun } from "../RunContext.jsx";
import { bandFor } from "../talktest.js";

export default function Account() {
  const { account, signOut, readings, latest } = useRun();

  return (
    <div className="page">
      <h1 className="title">You</h1>
      <p className="lede">
        This account lives in this browser only. Nothing is uploaded and there
        is no server to sign in to.
      </p>

      <div className="cards">
        <p className="card">
          <span className="card-label">Readings stored</span>
          <span className="card-value">{readings.length}</span>
        </p>
        <p className="card">
          <span className="card-label">Last zone</span>
          <span className="card-value">{latest ? latest.zone : "—"}</span>
        </p>
      </div>

      {latest ? (
        <p className="evidence">
          {latest.seconds.toFixed(1)} s of speech ·{" "}
          {bandFor(latest.zone)?.label}
        </p>
      ) : null}

      {account ? (
        <>
          <p className="evidence">Signed in locally as {account.email}.</p>
          <button className="quiet" onClick={signOut} type="button">
            Sign out
          </button>
        </>
      ) : (
        <p className="evidence">
          Not signed in. <Link to="/login">Log in</Link> to put a name on this
          phone&apos;s readings.
        </p>
      )}

      <p className="fine">
        <Link to="/settings">Settings</Link> · <Link to="/home">About</Link>
      </p>
    </div>
  );
}
