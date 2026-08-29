// Shared motion. One easing curve, one set of durations, one odometer, so
// nothing on the demo screen moves to its own timing.
//
// The laws this file exists to enforce:
//   1. Nothing autoplays. Every helper here is fired by a state change or a
//      reader action, never by a timer and never by a scroll position.
//   2. Transform and opacity only. Nothing here touches width, height, top
//      or left.
//   3. Exit runs at 65 percent of enter.
//   4. Reduced motion snaps to the settled value, never leaves a number half
//      rolled.
//   5. First paint is the settled state, so a headless browser and a judge's
//      phone see the same screen.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";

// Expo out, in three dialects, so no component invents its own.
export const EASE = [0.16, 1, 0.3, 1];
export const EASE_CSS = "cubic-bezier(0.16, 1, 0.3, 1)";
export const GSAP_EASE = "expo.out";

export const DUR = {
  micro: 0.15, // a colour or a border changing under a finger
  tap: 0.22, // a button acknowledging a press
  reveal: 0.3, // a panel arriving
  complex: 0.4, // several things arriving together
  page: 0.5, // a route change
  count: 0.72, // the odometer
};

// Exit is 60 to 70 percent of enter. Pinned at 65.
export const exitDuration = (enter = DUR.reveal) =>
  Math.round(enter * 0.65 * 1000) / 1000;

export const transition = (duration = DUR.reveal, delay = 0) => ({
  duration,
  delay,
  ease: EASE,
});

export const exitTransition = (enter = DUR.reveal) => ({
  duration: exitDuration(enter),
  ease: EASE,
});

// Micro interactions. Transform only, and neither starts from scale zero.
export const TAP = { scale: 0.97 };
export const HOVER = { y: -1 };

// A stagger that stays inside the complex budget however many items arrive.
export const stagger = (index, step = 0.04, cap = DUR.complex) =>
  Math.min(index * step, cap);

export function prefersReducedMotion() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function useReducedMotion() {
  const [still, setStill] = useState(prefersReducedMotion);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return undefined;
    }
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setStill(query.matches);
    onChange();
    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    }
    query.addListener(onChange);
    return () => query.removeListener(onChange);
  }, []);

  return still;
}

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

function formatText(value, decimals, format) {
  const safe = Number.isFinite(Number(value)) ? Number(value) : 0;
  const rounded = Number(safe.toFixed(decimals));
  if (typeof format === "function") return String(format(rounded));
  return rounded.toFixed(decimals);
}

// useCountUp rolls a number like an odometer.
//
// It returns a ref for the element that holds the number, and the settled text
// to render as that element's children. React owns the settled value, so the
// number is right on first paint and right again the moment the tween ends.
// GSAP owns the DOM text only while the roll runs, which keeps the roll off
// React's render path.
//
//   const split = useCountUp(pace, { format: paceLabel });
//   <span ref={split.ref}>{split.text}</span>
//
// It does not roll on mount by default: a first paint that is already settled
// is the only thing a headless capture and a slow phone can both agree on.
export function useCountUp(value, options = {}) {
  const {
    duration = DUR.count,
    ease = GSAP_EASE,
    decimals = 0,
    format,
    rollOnMount = false,
  } = options;

  const target = Number.isFinite(Number(value)) ? Number(value) : 0;
  const ref = useRef(null);
  const proxy = useRef({ value: rollOnMount ? 0 : target });
  const started = useRef(false);
  const formatRef = useRef(format);
  const text = formatText(target, decimals, format);

  useIsomorphicLayoutEffect(() => {
    formatRef.current = format;
  }, [format]);

  useIsomorphicLayoutEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const first = !started.current;
    started.current = true;
    const settled = formatText(target, decimals, formatRef.current);
    const snap =
      prefersReducedMotion() || duration <= 0 || (first && !rollOnMount);

    if (snap) {
      proxy.current.value = target;
      node.textContent = settled;
      return undefined;
    }

    // React has already painted the settled text as children. Put the tween's
    // starting value back before the browser paints, or the number flashes its
    // destination for one frame and then rolls to it from below.
    node.textContent = formatText(
      proxy.current.value,
      decimals,
      formatRef.current,
    );

    const tween = gsap.to(proxy.current, {
      value: target,
      duration,
      ease,
      overwrite: true,
      onUpdate() {
        node.textContent = formatText(
          proxy.current.value,
          decimals,
          formatRef.current,
        );
      },
      onComplete() {
        node.textContent = settled;
      },
    });

    return () => {
      tween.kill();
    };
  }, [target, duration, ease, decimals, rollOnMount]);

  return { ref, text };
}
