import { useEffect, useRef } from "react";
import gsap from "gsap";

// The card lands in 3D: GSAP brings it in from behind the segment at the 0.821
// scale the spec calls for, then settles it flat facing the viewer.
const IN_SCALE = 0.821;

const clock = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export default function KmCard({ split, flag, pinned }) {
  const cardRef = useRef(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(card, { opacity: 1, scale: 1, rotateX: 0, z: 0 });
      return undefined;
    }

    const tween = gsap.fromTo(
      card,
      { opacity: 0, scale: IN_SCALE, rotateX: -24, z: -120 },
      {
        opacity: 1,
        scale: 1,
        rotateX: 0,
        z: 0,
        duration: 0.42,
        ease: "power3.out",
      },
    );
    return () => tween.kill();
  }, [split.km]);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    gsap.to(card, {
      scale: pinned ? 1.12 : 1,
      duration: 0.35,
      ease: "power2.out",
    });
  }, [pinned]);

  return (
    <div
      className={pinned ? "km-card km-card-pinned" : "km-card"}
      ref={cardRef}
    >
      <span className="km-card-km">Km {split.km}</span>
      <dl className="km-card-rows">
        <div>
          <dt>Split</dt>
          <dd>{clock(split.pace)}</dd>
        </div>
        <div>
          <dt>Reported effort</dt>
          <dd>{split.effort}/10</dd>
        </div>
        <div>
          <dt>Cadence</dt>
          <dd>{split.cadence} spm</dd>
        </div>
      </dl>
      {flag ? (
        <p
          className={
            flag.kind === "form-collapse"
              ? "km-card-flag km-card-flag-collapse"
              : "km-card-flag"
          }
        >
          {flag.kind === "form-collapse" ? "Form collapse" : "Slowing"} — +
          {flag.paceSlip} s/km, cadence −{flag.cadenceDrop} spm
        </p>
      ) : (
        <p className="km-card-flag km-card-flag-clear">No flag</p>
      )}
    </div>
  );
}
