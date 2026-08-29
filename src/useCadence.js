import { useCallback, useEffect, useRef, useState } from "react";
import { createCadenceMeter } from "./cadence.js";

// iOS gates DeviceMotion behind a gesture-triggered permission prompt; every
// other browser just starts firing events.
const needsPermission = () =>
  typeof DeviceMotionEvent !== "undefined" &&
  typeof DeviceMotionEvent.requestPermission === "function";

export function useCadence() {
  const [spm, setSpm] = useState(0);
  const [live, setLive] = useState(false);
  const meterRef = useRef(null);
  const stopRef = useRef(null);

  if (meterRef.current === null) meterRef.current = createCadenceMeter();

  const listen = useCallback(() => {
    if (stopRef.current) return;
    const meter = meterRef.current;
    const onMotion = (event) => {
      const acceleration =
        event.acceleration ?? event.accelerationIncludingGravity;
      if (!acceleration) return;
      setSpm(meter.push(acceleration.y ?? 0, event.timeStamp));
      setLive(true);
    };
    window.addEventListener("devicemotion", onMotion);
    stopRef.current = () => {
      window.removeEventListener("devicemotion", onMotion);
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
  }, [listen]);

  return { spm, live, request };
}
