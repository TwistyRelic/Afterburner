import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  clearAccount,
  clearReadings,
  loadAccount,
  loadReadings,
  loadSettings,
  saveAccount,
  saveReading,
  saveSettings,
} from "./store.js";
import { zoneFor } from "./talktest.js";
import useMeasuredPace from "./useMeasuredPace.js";

const RunContext = createContext(null);

export function RunProvider({ children }) {
  const [readings, setReadings] = useState(loadReadings);
  const [account, setAccount] = useState(loadAccount);
  const [settings, setSettings] = useState(loadSettings);
  const { pace, km, supported: paceSupported } = useMeasuredPace();

  const addReading = useCallback(
    (seconds) => {
      const band = zoneFor(seconds);
      if (!band) return null;
      const reading = {
        id: `${Date.now()}`,
        at: new Date().toISOString(),
        seconds: Number(seconds.toFixed(2)),
        zone: band.zone,
        pace: pace ? Math.round(pace) : null,
        km: Number(km.toFixed(2)),
      };
      setReadings(saveReading(reading));
      return reading;
    },
    [km, pace],
  );

  const value = useMemo(
    () => ({
      readings,
      latest: readings[0] ?? null,
      addReading,
      forget: () => setReadings(clearReadings()),
      account,
      signIn: (email) => setAccount(saveAccount({ email, since: Date.now() })),
      signOut: () => setAccount(clearAccount()),
      settings,
      update: (patch) =>
        setSettings((current) => saveSettings({ ...current, ...patch })),
      pace,
      km,
      paceSupported,
    }),
    [account, addReading, km, pace, paceSupported, readings, settings],
  );

  return <RunContext.Provider value={value}>{children}</RunContext.Provider>;
}

export function useRun() {
  const value = useContext(RunContext);
  if (!value) throw new Error("useRun must be used inside RunProvider");
  return value;
}
