import { useEffect, useRef, useState } from "react";
import { paceFromSpeed } from "./pacing.js";

// Pace and distance come from the phone's own fixes. Before the first usable fix
// arrives both are null, and the screen shows a dash instead of a number.
const EARTH_RADIUS_M = 6371000;

function metresBetween(a, b) {
  const lat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const lon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const mid = ((a.latitude + b.latitude) / 2) * (Math.PI / 180);
  const x = lon * Math.cos(mid);
  return Math.sqrt(lat * lat + x * x) * EARTH_RADIUS_M;
}

export default function useMeasuredPace() {
  const [pace, setPace] = useState(null);
  const [km, setKm] = useState(0);
  const [supported, setSupported] = useState(true);
  const lastRef = useRef(null);

  useEffect(() => {
    if (!navigator.geolocation?.watchPosition) {
      setSupported(false);
      return undefined;
    }
    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { coords, timestamp } = position;
        const last = lastRef.current;
        lastRef.current = { coords, timestamp };
        if (Number.isFinite(coords.speed) && coords.speed !== null) {
          const fromSpeed = paceFromSpeed(coords.speed);
          if (fromSpeed) setPace(fromSpeed);
        }
        if (!last) return;
        const metres = metresBetween(last.coords, coords);
        const seconds = (timestamp - last.timestamp) / 1000;
        if (metres < 3 || seconds <= 0) return;
        setKm((value) => value + metres / 1000);
        if (!Number.isFinite(coords.speed) || coords.speed === null) {
          const derived = paceFromSpeed(metres / seconds);
          if (derived) setPace(derived);
        }
      },
      () => setSupported(false),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  return { pace, km, supported };
}
