import { useEffect, useRef, useState } from "react";
import { STATIONARY_SECONDS, createMovementGate } from "./movement.js";

const IDLE = { stationary: false, moved: 0, stillSeconds: 0 };

// Watches position and re-evaluates every second, because a phone that is not
// moving may stop reporting new fixes entirely — silence is the evidence.
export function useMovement() {
  const [state, setState] = useState(IDLE);
  const [watching, setWatching] = useState(false);
  const gateRef = useRef(null);

  if (gateRef.current === null) gateRef.current = createMovementGate();

  useEffect(() => {
    const gate = gateRef.current;
    if (!navigator.geolocation) return undefined;

    const id = navigator.geolocation.watchPosition(
      (position) => {
        setWatching(true);
        setState(
          gate.push({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            timestamp: position.timestamp,
          }),
        );
      },
      () => {
        // No permission, no gate: the run is never locked on a guess.
        setWatching(false);
        gate.reset();
        setState(IDLE);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );

    const tick = setInterval(() => setState(gate.state(Date.now())), 1000);

    return () => {
      navigator.geolocation.clearWatch(id);
      clearInterval(tick);
    };
  }, []);

  return {
    locked: watching && state.stationary,
    watching,
    moved: state.moved,
    stillSeconds: state.stillSeconds,
    countdown: Math.max(0, Math.ceil(STATIONARY_SECONDS - state.stillSeconds)),
  };
}
