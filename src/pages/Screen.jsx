import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Ribbon from "../Ribbon.jsx";
import { run } from "../run.js";

// Live decoupling: effort held, pace fell away. Sweeps green to red as the
// run walks forward, so the bar is always moving on stage.
const DECOUPLE = [2, 3, 3, 5, 8, 14, 18, 21, 24, 26];

export default function Screen() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((current) => (current + 1) % DECOUPLE.length);
    }, 1400);
    return () => clearInterval(timer);
  }, []);

  const decouple = DECOUPLE[step];

  return (
    <div className="screen">
      <div className="plate screen-top">
        <span className="plate-label">Spoken</span>
        <span className="plate-value">
          {run.markers} markers · {run.dictatedAt} of {run.distance}
        </span>
      </div>

      <div className="screen-stage">
        <Ribbon />
        <div className="plate screen-hero">
          <span className="plate-label">The gap opened at</span>
          <span className="screen-huge">KM {run.focusKm}</span>
          <span className="plate-value">
            {run.slower}/km slower · cadence −{run.cadenceDrop}
          </span>
        </div>
        <div className="plate screen-said">
          <span className="plate-label">You said</span>
          <span className="plate-value">{run.said}</span>
        </div>
      </div>

      <div className="plate screen-bar-plate">
        <span className="plate-label">Effort held, pace fell</span>
        <div className="bar" role="img" aria-label={`${decouple}% decoupling`}>
          <motion.div
            className="bar-fill"
            animate={{ width: `${decouple * 3.2}%` }}
            transition={{ duration: 1.1, ease: "easeOut" }}
          />
        </div>
        <span className="plate-value">{decouple}% decoupling</span>
      </div>

      <button className="mic" type="button">
        <span className="mic-inner">Speak</span>
      </button>
    </div>
  );
}
