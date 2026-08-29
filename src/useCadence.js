import { useCallback, useEffect, useRef, useState } from "react";
import { createCadenceMeter } from "./cadence.js";

// iOS gates DeviceMotion behind a gesture-triggered permission prompt; every
// other browser just starts firing events.
const needsPermission = () =>
  typeof DeviceMotionEvent !== "undefined" &&
  typeof DeviceMotionEvent.requestPermission === "function";

// Desktop browsers define DeviceMotionEvent and then never fire one, so the
// only honest test of support is whether a reading actually arrives.
export const SILENCE_MS = 4000;

export function useCadence() {
  const [spm, setSpm] = useState(0);
  const [live, setLive] = useState(false);
  const [supported, setSupported] = useState(
    typeof DeviceMotionEvent !== "undefined",
  );
  const meterRef = useRef(null);
  const stopRef = useRef(null);
  const silenceRef = useRef(null);

  if (meterRef.current === null) meterRef.current = createCadenceMeter();

  const listen = useCallback(() => {
    if (stopRef.current) return;
    const meter = meterRef.current;
    const onMotion = (event) => {
      const acceleration =
        event.acceleration ?? event.accelerationIncludingGravity;
      if (!acceleration) return;
      clearTimeout(silenceRef.current);
      setSupported(true);
      setSpm(meter.push(acceleration.y ?? 0, event.timeStamp));
      setLive(true);
    };
    window.addEventListener("devicemotion", onMotion);
    silenceRef.current = setTimeout(() => setSupported(false), SILENCE_MS);
    stopRef.current = () => {
      window.removeEventListener("devicemotion", onMotion);
      clearTimeout(silenceRef.current);
      stopRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!needsPermission()) listen();
    return () => stopRef.current?.();
  }, [listen]);

  // Call from a tap: on iOS this is the only place the prompt can be raised.
  const request = useCallback(async () => {
    if (!needsPermission()) return;
    const state = await DeviceMotionEvent.requestPermission();
    if (state === "granted") listen();
    else setSupported(false);
  }, [listen]);

  return { spm, live, supported, request };
}
