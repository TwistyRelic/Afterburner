import { useState } from "react";

const KEY = "afterburner.account";

const read = () => {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || '{"name":"","units":"km"}');
  } catch {
    return { name: "", units: "km" };
  }
};

export default function Account() {
  const [account, setAccount] = useState(read);
  const [status, setStatus] = useState("");

  const flash = (message) => {
    setStatus(message);
    window.setTimeout(() => setStatus(""), 2600);
  };

  const save = (next) => {
    const merged = { ...account, ...next };
    setAccount(merged);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(merged));
    } catch {
      /* storage unavailable, the session still works */
    }
  };

  const exportData = () => {
    let runs = [];
    try {
      runs = JSON.parse(window.localStorage.getItem("afterburner.runs") || "[]");
    } catch {
      runs = [];
    }
    const blob = new Blob([JSON.stringify({ account, runs }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "afterburner-data.json";
    a.click();
    URL.revokeObjectURL(url);
    flash("Downloaded.");
  };

  const wipe = () => {
    if (!window.confirm("Delete every run and setting on this device? This cannot be undone.")) return;
    try {
      window.localStorage.removeItem(KEY);
      window.localStorage.removeItem("afterburner.runs");
    } catch {
      /* nothing to clear */
    }
    setAccount({ name: "", units: "km" });
    flash("Everything on this device has been deleted.");
  };

  return (
    <div className="account">
      <h1>You</h1>

      <p className="local-only">
        No account is created and nothing leaves this phone. Your name, your settings and
        every run you record are stored in this browser only. Clearing your browser data
        removes them.
      </p>

      <label>
        Display name
        <input
          type="text"
          value={account.name}
          placeholder="What should we call you?"
          onChange={(event) => save({ name: event.target.value })}
        />
      </label>

      <label>
        Units
        <select value={account.units} onChange={(event) => save({ units: event.target.value })}>
          <option value="km">Kilometres</option>
          <option value="mi">Miles</option>
        </select>
      </label>

      <button type="button" className="ghost wide" onClick={exportData}>
        Export my data
      </button>
      <button type="button" className="ghost wide" onClick={wipe}>
        Delete everything on this device
      </button>

      {status && <p className="heard">{status}</p>}
    </div>
  );
}
