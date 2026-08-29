import { useState } from "react";
import { motion } from "framer-motion";
import { bandFor, breathingScore } from "../analysis.js";

const EASE = [0.16, 1, 0.3, 1];
const KEY = "afterburner.account";

const read = (k, f) => {
  try {
    return JSON.parse(window.localStorage.getItem(k) || f);
  } catch {
    return JSON.parse(f);
  }
};

const fmt = (s) => {
  if (!Number.isFinite(s)) return "0:00";
  const w = Math.round(s);
  return Math.floor(w / 60) + ":" + String(w % 60).padStart(2, "0");
};

const when = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString([], { day: "numeric", month: "short" }) +
      ", " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
};

export default function Account() {
  const [account, setAccount] = useState(() => read(KEY, '{"name":"","units":"km"}'));
  const [status, setStatus] = useState("");
  const runs = read("afterburner.runs", "[]");
  const readings = read("afterburner.readings", "[]");

  const flash = (m) => {
    setStatus(m);
    window.setTimeout(() => setStatus(""), 2400);
  };

  const save = (next) => {
    const merged = { ...account, ...next };
    setAccount(merged);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(merged));
    } catch {
      /* unavailable */
    }
  };

  const exportAll = () => {
    const blob = new Blob([JSON.stringify({ account, runs, readings }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "afterburner-data.json";
    a.click();
    URL.revokeObjectURL(url);
    flash("Downloaded.");
  };

  const wipe = () => {
    if (!window.confirm("Delete every run, reading and setting on this device?")) return;
    ["afterburner.runs", "afterburner.readings", KEY].forEach((k) => {
      try {
        window.localStorage.removeItem(k);
      } catch {
        /* nothing */
      }
    });
    setAccount({ name: "", units: "km" });
    flash("Deleted.");
  };

  const totalKm = runs.reduce((s, r) => s + (r.distanceKm || 0), 0);

  return (
    <div className="you">
      <motion.header
        className="you-head"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <div className="you-avatar" aria-hidden="true">
          {(account.name || "?").slice(0, 1).toUpperCase()}
        </div>
        <div>
          <h1>{account.name || "Runner"}</h1>
          <p>Everything below is on this phone only.</p>
        </div>
      </motion.header>

      <div className="you-stats">
        <div>
          <span className="you-stat-v">{runs.length}</span>
          <span className="you-stat-l">runs</span>
        </div>
        <div>
          <span className="you-stat-v">{totalKm.toFixed(1)}</span>
          <span className="you-stat-l">km</span>
        </div>
        <div>
          <span className="you-stat-v">{readings.length}</span>
          <span className="you-stat-l">readings</span>
        </div>
      </div>

      <section className="you-sec">
        <h2>Ghost runs</h2>
        {runs.length === 0 ? (
          <div className="empty-state">
            <strong>No runs yet</strong>
            <span>Start one on the Run tab and it will appear here.</span>
          </div>
        ) : (
          <div className="you-list">
            {runs.map((r, i) => (
              <motion.div
                className="you-row"
                key={r.at || i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE, delay: i * 0.04 }}
              >
                <div className="you-row-top">
                  <span className="you-row-title">{(r.distanceKm || 0).toFixed(2)} km</span>
                  <span className="you-row-when">{when(r.at)}</span>
                </div>
                <div className="you-row-nums">
                  <span>{fmt(r.avgPace)} yours</span>
                  <span>{fmt(r.ghostPace)} ghost</span>
                  <span>{r.adjustments || 0} adjustments</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <section className="you-sec">
        <h2>Breathing readings</h2>
        {readings.length === 0 ? (
          <div className="empty-state">
            <strong>No readings yet</strong>
            <span>Take a talk test on the Breath tab. It takes twelve seconds.</span>
          </div>
        ) : (
          <div className="you-list">
            {readings.map((r, i) => {
              const score = breathingScore(r);
              const band = bandFor(score);
              return (
                <div className="you-row" key={r.at || i} style={{ "--band": band.colour }}>
                  <div className="you-row-top">
                    <span className="you-row-title">
                      <span className="you-pip" /> {score ?? "-"} out of 100
                    </span>
                    <span className="you-row-when">{when(r.at)}</span>
                  </div>
                  <div className="you-row-nums">
                    <span>{r.phraseLength ?? "-"}s between breaths</span>
                    <span>{r.zone?.name ?? "no zone"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="you-sec">
        <h2>Settings</h2>
        <label className="you-field">
          Display name
          <input
            type="text"
            value={account.name}
            placeholder="Your name"
            onChange={(e) => save({ name: e.target.value })}
          />
        </label>
        <label className="you-field">
          Units
          <select value={account.units} onChange={(e) => save({ units: e.target.value })}>
            <option value="km">Kilometres</option>
            <option value="mi">Miles</option>
          </select>
        </label>
        <button
          type="button"
          className="ghost wide"
          onClick={() => {
            // Signing out clears the name only. Runs and readings stay on the
            // device, so signing back in finds them again.
            try { window.localStorage.setItem(KEY, JSON.stringify({ name: "", units: account.units })); }
            catch { /* unavailable */ }
            window.location.href = "/";
          }}
        >
          Sign out
        </button>
        <button type="button" className="ghost wide" onClick={exportAll}>Export my data</button>
        <button type="button" className="ghost wide danger" onClick={wipe}>Delete everything</button>
        {status && <p className="heard">{status}</p>}
      </section>

      <p className="honest-note">
        No account exists on any server. Your name, runs and readings live in this browser
        and nothing has ever been uploaded.
      </p>
    </div>
  );
}
