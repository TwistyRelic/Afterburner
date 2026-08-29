import gsap from "gsap";
import { useEffect, useRef } from "react";
import { bandFor } from "./talktest.js";

const CIRCUMFERENCE = 2 * Math.PI * 54;

// The ring fills by zone out of five, so the drawing carries no number the
// reading did not produce.
export default function ZoneDial({ zone, seconds }) {
  const arcRef = useRef(null);
  const numberRef = useRef(null);
  const band = zone ? bandFor(zone) : null;

  useEffect(() => {
    const arc = arcRef.current;
    if (!arc) return;
    const filled = zone ? (zone / 5) * CIRCUMFERENCE : 0;
    gsap.to(arc, {
      strokeDashoffset: CIRCUMFERENCE - filled,
      duration: 0.7,
      ease: "power3.out",
    });
    if (numberRef.current && zone) {
      gsap.fromTo(
        numberRef.current,
        { scale: 0.86, opacity: 0.4 },
        { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(2)" },
      );
    }
  }, [zone]);

  return (
    <div className={zone ? `dial dial-z${zone}` : "dial"}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="dial-track" cx="60" cy="60" r="54" />
        <circle
          className="dial-arc"
          cx="60"
          cy="60"
          r="54"
          ref={arcRef}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE}
        />
      </svg>
      <div className="dial-face">
        <span className="dial-number" ref={numberRef}>
          {zone ?? "—"}
        </span>
        <span className="dial-caption">
          {zone ? `zone ${zone} of 5` : "no reading yet"}
        </span>
      </div>
      <p className="dial-band">
        {band ? band.label : "Read the sentence to get a zone"}
      </p>
      {seconds ? (
        <p className="dial-source">
          measured {seconds.toFixed(1)} s of speech before the breath
        </p>
      ) : null}
    </div>
  );
}
