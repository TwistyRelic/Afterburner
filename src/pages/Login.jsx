import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRun } from "../RunContext.jsx";

export default function Login() {
  const { account, signIn, signOut } = useRun();
  const [email, setEmail] = useState("");
  const [problem, setProblem] = useState(null);
  const navigate = useNavigate();

  const submit = (event) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setProblem("That does not look like an email address.");
      return;
    }
    setProblem(null);
    signIn(email);
    navigate("/");
  };

  return (
    <div className="page">
      <h1 className="title">Log in</h1>
      <p className="lede">
        There is no server. Your address is kept in this browser so the app can
        put a name on your readings.
      </p>

      {account ? (
        <>
          <p className="evidence">Signed in locally as {account.email}.</p>
          <button className="quiet" onClick={signOut} type="button">
            Sign out
          </button>
        </>
      ) : (
        <form className="form" onSubmit={submit}>
          <label className="field">
            <span>Email</span>
            <input
              autoComplete="email"
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              type="email"
              value={email}
            />
          </label>
          {problem ? <p className="problem">{problem}</p> : null}
          <button className="cta" type="submit">
            Log in on this phone
          </button>
        </form>
      )}

      <button className="quiet" onClick={() => navigate("/")} type="button">
        Skip and just run
      </button>
    </div>
  );
}
