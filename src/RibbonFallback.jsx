// The 2D strip. It is what the stage falls back to when WebGL is missing,
// blocked, lost mid demo, or when anything inside the 3D scene throws.
//
// It carries the same three facts as the ribbon, read off the same helpers in
// summary.js, so the two renderers cannot drift into telling different stories
// about one run: one bar per kilometre, height is how slow that kilometre was
// inside this run, colour is the effort called out loud, and a flagged
// kilometre is capped in white.
//
// Nothing here animates and none of it needs a GPU.

import { useEffect, useMemo, useRef } from "react";
import {
  cleanSplits,
  describe,
  effortHex,
  heightsFor,
  HARD_HEX,
  UNKNOWN_HEX,
} from "./summary.js";

const LINE = "#232A34";
const INK = "#EDF1F6";

// A bar never drops below this share of the height available, so a run at an
// even pace reads as a flat ribbon rather than a row of stubs.
const FLOOR_SHARE = 0.3;

function barPath(context, x, y, width, height, radius) {
  context.beginPath();
  if (typeof context.roundRect === "function") {
    context.roundRect(x, y, width, height, [radius, radius, 0, 0]);
    return;
  }
  context.moveTo(x, y + height);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height);
  context.closePath();
}

function paint(context, canvas, rows, flagged, drained) {
  const cssWidth = canvas.clientWidth;
  const cssHeight = canvas.clientHeight;
  if (!cssWidth || !cssHeight) return;

  const ratio = Math.min(
    typeof window === "undefined" ? 1 : window.devicePixelRatio || 1,
    2,
  );
  canvas.width = Math.round(cssWidth * ratio);
  canvas.height = Math.round(cssHeight * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, cssWidth, cssHeight);

  const padX = 12;
  const labelBand = 26; // room under the baseline for the kilometre numbers
  const capBand = 12; // room above the tallest bar for its white cap
  const baseline = Math.round(cssHeight - labelBand) + 0.5;
  const usable = Math.max(24, baseline - capBand);

  const gap = Math.max(2, Math.min(10, cssWidth * 0.012));
  const barWidth = Math.max(
    4,
    (cssWidth - padX * 2 - gap * (rows.length - 1)) / rows.length,
  );
  const total = rows.length * barWidth + (rows.length - 1) * gap;
  const startX = (cssWidth - total) / 2;
  const heights = heightsFor(rows);

  context.strokeStyle = LINE;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(padX, baseline);
  context.lineTo(cssWidth - padX, baseline);
  context.stroke();

  rows.forEach((row, index) => {
    const height = Math.max(
      2,
      usable * (FLOOR_SHARE + (1 - FLOOR_SHARE) * heights.norm[index]),
    );
    const x = startX + index * (barWidth + gap);
    const y = baseline - height;
    const isFlagged = flagged.has(row.km);

    context.save();
    if (isFlagged && !drained) {
      context.shadowColor = HARD_HEX;
      context.shadowBlur = 18;
    }
    context.fillStyle = drained ? UNKNOWN_HEX : effortHex(row.effort);
    barPath(context, x, y, barWidth, height, Math.min(4, barWidth / 3));
    context.fill();
    context.restore();

    if (isFlagged) {
      context.fillStyle = INK;
      context.fillRect(x, Math.max(2, y - 6), barWidth, 3);
    }

    // The number is drawn only where there is room to draw it at a size worth
    // reading. A 9px label is worse than no label.
    if (barWidth >= 22) {
      context.fillStyle = isFlagged ? INK : UNKNOWN_HEX;
      context.font =
        "14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "top";
      context.fillText(String(row.km), x + barWidth / 2, baseline + 7);
    }
  });
}

export default function RibbonFallback({
  splits = [],
  flags = [],
  locked = false,
  className = "ribbon",
}) {
  const rows = useMemo(() => cleanSplits(splits), [splits]);
  const flagged = useMemo(
    () => new Set(flags.map((flag) => flag.km)),
    [flags],
  );
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !rows.length) return undefined;

    let context = null;
    try {
      context = canvas.getContext("2d");
    } catch {
      context = null;
    }
    if (!context) return undefined;

    const draw = () => {
      try {
        paint(context, canvas, rows, flagged, locked);
      } catch {
        // A strip that cannot draw leaves the written summary below it
        // standing rather than taking the screen down with it.
      }
    };

    draw();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(draw);
      observer.observe(canvas);
      return () => observer.disconnect();
    }
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [rows, flagged, locked]);

  if (!rows.length) return null;

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{ display: "block", width: "100%", height: "100%" }}
      />
      <p className="sr-only">{describe(rows, flagged)}</p>
    </div>
  );
}
