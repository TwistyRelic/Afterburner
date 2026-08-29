// The vertical card rotator, once, for every page that uses it.
//
// One dominant portrait card centred over a giant drifting ribbon of display
// type, one neighbour turned almost edge on either side, and whatever the page
// puts below it acts on the card at the front.
//
// Every advance is a duration based animation fired by a reader action: an
// arrow, an arrow key, a drag, or a dot. It does not pin, it does not autoplay,
// and initial={false} means it paints settled on first render rather than
// waiting for an animation that a headless browser will never run.

import { motion } from "framer-motion";
import { DUR, EASE, useReducedMotion } from "./motion.js";

export default function Rotator({
  items,
  index,
  onIndex,
  label,
  type,
  card,
  children,
}) {
  const still = useReducedMotion();
  const duration = still ? 0 : DUR.complex;
  const count = items.length;

  const step = (delta) => onIndex((index + delta + count) % count);

  const onKeyDown = (event) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      step(1);
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      step(-1);
    }
  };

  const front = items[index];

  return (
    <div className="ab-rotator">
      <div className="ab-type" aria-hidden="true">
        <motion.div
          className="ab-type-track"
          initial={false}
          animate={{ x: index * -112 - 32 }}
          transition={{ duration, ease: EASE }}
        >
          <span>{type}</span>
          <span>{type}</span>
          <span>{type}</span>
        </motion.div>
      </div>

      <motion.div
        className="ab-stage"
        role="group"
        aria-roledescription="carousel"
        aria-label={label}
        tabIndex={0}
        onKeyDown={onKeyDown}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.14}
        onDragEnd={(event, info) => {
          if (info.offset.x < -56 || info.velocity.x < -420) step(1);
          else if (info.offset.x > 56 || info.velocity.x > 420) step(-1);
        }}
      >
        {items.map((item, i) => {
          const half = count / 2;
          let offset = i - index;
          if (offset > half) offset -= count;
          if (offset < -half) offset += count;
          const near = Math.abs(offset) <= 1;
          const isFront = offset === 0;
          return (
            <motion.div
              className="ab-slot"
              key={item.id}
              initial={false}
              animate={{
                x: offset * 62 + "%",
                rotateY: offset * -70,
                scale: isFront ? 1 : 0.84,
                opacity: isFront ? 1 : near ? 0.45 : 0,
              }}
              transition={{ duration, ease: EASE }}
              style={{
                zIndex: isFront ? 3 : near ? 2 : 1,
                pointerEvents: isFront ? "auto" : "none",
              }}
              aria-hidden={!isFront}
            >
              {card(item, isFront)}
            </motion.div>
          );
        })}
      </motion.div>

      <div className="ab-controls">
        <button
          className="ab-arrow"
          type="button"
          onClick={() => step(-1)}
          aria-label="Show the previous card"
        >
          {"<"}
        </button>
        <span className="ab-count">
          {index + 1} of {count}
        </span>
        <button
          className="ab-arrow"
          type="button"
          onClick={() => step(1)}
          aria-label="Show the next card"
        >
          {">"}
        </button>
      </div>

      <div className="ab-dots">
        {items.map((item, i) => (
          <button
            className="ab-dot"
            key={item.id}
            type="button"
            aria-current={i === index}
            aria-label={"Show " + item.title}
            onClick={() => onIndex(i)}
          >
            <i />
          </button>
        ))}
      </div>

      <p className="sr-only" role="status">
        {index + 1} of {count}. {front.title}
      </p>

      {children}
    </div>
  );
}
