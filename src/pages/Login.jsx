import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";

// There is no account system. This screen writes two values into this browser
// and nothing else. The key names are the contract shared with the rest of the
// app, so they are stated once here and must not drift.
const PREFIX = "afterburner.";
const KEY_ACCOUNT = "afterburner.account";
const EMPTY = { name: "", units: "km" };

// Reading storage can throw outright in a private window or with site data
// blocked, so every touch of it is wrapped. A failed read leaves the screen
// working and says so, rather than taking the page down.
function readAccount() {
  try {
    const raw = window.localStorage.getItem(KEY_ACCOUNT);
    if (!raw) return { value: { ...EMPTY }, ok: true };
    const parsed = JSON.parse(raw);
    return {
      value: {
        name: typeof parsed.name === "string" ? parsed.name : "",
        units: parsed.units === "mi" ? "mi" : "km",
      },
      ok: true,
    };
  } catch {
    return { value: { ...EMPTY }, ok: false };
  }
}

function writeAccount(value) {
  try {
    window.localStorage.setItem(KEY_ACCOUNT, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function ourKeys() {
  const keys = [];
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(PREFIX)) keys.push(key);
    }
  } catch {
    return null;
  }
  return keys;
}

// Everything this app has put on the device, in one object, values parsed back
// out of their stored form so the file reads as data and not as escaped text.
function collectEverything() {
  const keys = ourKeys();
  if (keys === null) return null;
  const out = {};
  keys.forEach((key) => {
    try {
      const raw = window.localStorage.getItem(key);
      try {
        out[key] = JSON.parse(raw);
      } catch {
        out[key] = raw;
      }
    } catch {
      out[key] = null;
    }
  });
  return out;
}

export default function Login() {
  const initial = useMemo(() => readAccount(), []);
  const [name, setName] = useState(initial.value.name);
  const [units, setUnits] = useState(initial.value.units);
  const [storageOk, setStorageOk] = useState(initial.ok);
  const [saved, setSaved] = useState("");
  const [dump, setDump] = useState(null);
  const [dataSaid, setDataSaid] = useState("");
  const [asking, setAsking] = useState(false);
  const [deleteSaid, setDeleteSaid] = useState("");

  const save = useCallback(
    (event) => {
      event.preventDefault();
      const ok = writeAccount({ name: name.trim(), units });
      setStorageOk(ok);
      setSaved(
        ok
          ? "Saved on this device."
          : "This browser refused to store it, so nothing was saved. The app still runs.",
      );
    },
    [name, units],
  );

  const exportData = useCallback(() => {
    const everything = collectEverything();
    if (everything === null) {
      setDump(null);
      setDataSaid(
        "This browser will not let the app read its own storage, so there is nothing to hand over.",
      );
      return;
    }
    const keys = Object.keys(everything);
    if (!keys.length) {
      setDump(null);
      setDataSaid("There is nothing stored on this device yet.");
      return;
    }
    const text = JSON.stringify(everything, null, 2);
    setDump(text);

    try {
      const blob = new Blob([text], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "afterburner-data.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDataSaid(
        "Downloaded as afterburner-data.json, and printed below in case the download was blocked. " +
          keys.length +
          (keys.length === 1 ? " entry." : " entries."),
      );
    } catch {
      setDataSaid(
        "The download was blocked, so the file is printed below instead. Select it and copy it.",
      );
    }
  }, []);

  const wipe = useCallback(() => {
    const keys = ourKeys();
    if (keys === null) {
      setAsking(false);
      setDeleteSaid(
        "This browser will not let the app reach its own storage, so there was nothing it could delete.",
      );
      return;
    }
    let removed = 0;
    keys.forEach((key) => {
      try {
        window.localStorage.removeItem(key);
        removed += 1;
      } catch {
        // One key refused. The rest still go.
      }
    });
    setName("");
    setUnits("km");
    setDump(null);
    setDataSaid("");
    setSaved("");
    setAsking(false);
    setDeleteSaid(
      removed
        ? "Deleted. " +
            removed +
            (removed === 1 ? " entry" : " entries") +
            " removed from this device, including every run saved in this browser."
        : "There was nothing stored on this device to delete.",
    );
  }, []);

  return (
    <main className="ab-page" data-shell-doc="true">
      <header className="ab-hero">
        <div className="ab-wrap ab-wrap-narrow">
          <h1 className="ab-h1">Set up on this device</h1>
          <p className="ab-lede">
            There is no account here. No password, no sign in, no server.{" "}
            <strong>
              Your name and your units are written into this browser and nothing
              leaves this device.
            </strong>{" "}
            Open the app on another phone and it starts empty, because there is
            nowhere for it to have been sent.
          </p>
          {storageOk ? null : (
            <p className="ab-source">
              This browser is blocking storage for this site, so nothing here
              can be kept between visits. Everything else in the app still
              works.
            </p>
          )}
        </div>
      </header>

      <div className="ab-wrap ab-wrap-narrow">
        <section className="ab-sec ab-sec-tight">
          <h2 className="ab-h2">Your details</h2>
          <form onSubmit={save}>
            <div className="ab-field">
              <label className="ab-label" htmlFor="login-name">
                Display name
              </label>
              <input
                className="ab-input"
                id="login-name"
                type="text"
                value={name}
                autoComplete="nickname"
                placeholder="What should the screens call you?"
                onChange={(event) => {
                  setName(event.target.value);
                  setSaved("");
                }}
              />
              <p className="ab-note">
                Shown on your own screens on this device. Leave it blank if you
                would rather not have one.
              </p>
            </div>

            <div className="ab-field" style={{ marginTop: 22 }}>
              <fieldset className="ab-units">
                <legend className="ab-label">Units</legend>
                {[
                  { id: "km", label: "Kilometres" },
                  { id: "mi", label: "Miles" },
                ].map((option) => (
                  <label
                    key={option.id}
                    className={
                      units === option.id ? "ab-unit ab-unit-on" : "ab-unit"
                    }
                  >
                    <input
                      type="radio"
                      name="units"
                      value={option.id}
                      checked={units === option.id}
                      onChange={() => {
                        setUnits(option.id);
                        setSaved("");
                      }}
                    />
                    {option.label}
                  </label>
                ))}
              </fieldset>
              <p className="ab-note">
                Saved beside your name. The live run counts in kilometres today,
                so this sets what the screens say as each one is wired to read
                it.
              </p>
            </div>

            <div className="ab-actions">
              <button className="ab-btn ab-btn-solid" type="submit">
                Save on this device
              </button>
            </div>
            <p className="ab-said" role="status">
              {saved}
            </p>
          </form>
        </section>

        <section className="ab-sec">
          <h2 className="ab-h2">Your data</h2>
          <p className="ab-p">
            Everything this app has put on this device, in one file: your name,
            your units and every run saved in this browser.
          </p>
          <div className="ab-actions">
            <button
              className="ab-btn ab-btn-ghost"
              type="button"
              onClick={exportData}
            >
              Export my data
            </button>
            {dump ? (
              <button
                className="ab-btn ab-btn-ghost"
                type="button"
                onClick={() => {
                  setDump(null);
                  setDataSaid("");
                }}
              >
                Hide it
              </button>
            ) : null}
          </div>
          <p className="ab-said" role="status">
            {dataSaid}
          </p>
          {dump ? <pre className="ab-dump">{dump}</pre> : null}
        </section>

        <section className="ab-sec">
          <h2 className="ab-h2">Delete everything</h2>
          <p className="ab-p">
            This removes your name, your units and every run saved in this
            browser. It happens on this device and cannot be undone, so export
            first if you want to keep any of it.
          </p>

          {asking ? (
            <>
              <p className="ab-read">Delete all of it from this device?</p>
              <div className="ab-actions">
                <button
                  className="ab-btn ab-btn-danger"
                  type="button"
                  onClick={wipe}
                >
                  Yes, delete it
                </button>
                <button
                  className="ab-btn ab-btn-ghost"
                  type="button"
                  onClick={() => setAsking(false)}
                >
                  Keep it
                </button>
              </div>
            </>
          ) : (
            <div className="ab-actions">
              <button
                className="ab-btn ab-btn-danger"
                type="button"
                onClick={() => {
                  setDeleteSaid("");
                  setAsking(true);
                }}
              >
                Delete everything
              </button>
            </div>
          )}

          <p className="ab-said" role="status">
            {deleteSaid}
          </p>
        </section>

        <section className="ab-sec">
          <p className="ab-note">
            All of it lives in the storage this browser keeps for this site.
            Clearing your browser data, or using a private window, removes it
            just as the button above does.
          </p>
          <div className="ab-actions">
            <Link className="ab-btn ab-btn-ghost" to="/run">
              Start a run
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
