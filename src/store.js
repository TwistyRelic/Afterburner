// Everything the app remembers lives in this browser. There is no account
// server, no upload, and nothing leaves the phone.
const KEYS = {
  readings: "afterburner.readings",
  account: "afterburner.account",
  settings: "afterburner.settings",
};

export const DEFAULT_SETTINGS = { targetZone: 2, spoken: true };

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // A phone with storage blocked still runs; it just forgets.
  }
}

export function loadReadings() {
  const value = read(KEYS.readings, []);
  return Array.isArray(value) ? value : [];
}

export function saveReading(reading) {
  const next = [reading, ...loadReadings()].slice(0, 200);
  write(KEYS.readings, next);
  return next;
}

export function clearReadings() {
  write(KEYS.readings, []);
  return [];
}

export function loadAccount() {
  const value = read(KEYS.account, null);
  return value && typeof value.email === "string" ? value : null;
}

export function saveAccount(account) {
  write(KEYS.account, account);
  return account;
}

export function clearAccount() {
  write(KEYS.account, null);
  return null;
}

export function loadSettings() {
  const value = read(KEYS.settings, null);
  return { ...DEFAULT_SETTINGS, ...(value ?? {}) };
}

export function saveSettings(settings) {
  write(KEYS.settings, settings);
  return settings;
}
