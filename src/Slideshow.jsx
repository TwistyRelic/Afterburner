import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { features } from "./features.js";

const INTERVAL_MS = 4500;

export default function Slideshow() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return undefined;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % features.length);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [paused]);

  const slide = features[index];

  return (
    <div
      className="slideshow"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="slide-stage">
        <AnimatePresence mode="wait">
          <motion.div
            className="slide"
            key={slide.title}
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -32 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <h3>{slide.title}</h3>
            <p>{slide.body}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="slide-dots">
        {features.map((feature, dotIndex) => (
          <button
            key={feature.title}
            type="button"
            className={dotIndex === index ? "dot dot-active" : "dot"}
            aria-label={`Show feature: ${feature.title}`}
            aria-current={dotIndex === index}
            onClick={() => setIndex(dotIndex)}
          />
        ))}
      </div>
    </div>
  );
}
