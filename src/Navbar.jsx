// One glass bar for the whole app. It floats over the content, keeps a
// hairline border, and compacts on scroll. Every page below it renders no bar
// of its own, which is the single thing three of the five builds disagreed
// about and the reason two routes were shipping two navbars.

import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { DUR, EASE, exitDuration, useReducedMotion } from "./motion.js";

// About one thumb flick. Compacting after that reads as a response to the
// reader rather than something the page decided to do on its own.
const COMPACT_AT = 40;

const LINKS = [
  { to: "/home", label: "Home" },
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/sessions", label: "Sessions" },
];

export default function Navbar() {
  const location = useLocation();
  const still = useReducedMotion();
  const [compact, setCompact] = useState(false);
  const [open, setOpen] = useState(false);
  const burgerRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > COMPACT_AT);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // A route change closes the sheet, so the menu never outlives the navigation
  // that opened it.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      if (burgerRef.current) burgerRef.current.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const enter = { duration: still ? 0 : DUR.reveal, ease: EASE };
  const leave = {
    duration: still ? 0 : exitDuration(DUR.reveal),
    ease: EASE,
  };
  const pill = {
    type: "tween",
    duration: still ? 0 : DUR.reveal,
    ease: EASE,
  };

  return (
    <>
      <a className="nav-skip" href="#ab-main">
        Skip to the page
      </a>

      <nav className={compact ? "nav is-compact" : "nav"} aria-label="Main">
        <div className="nav-veil" aria-hidden="true" />
        <div className="nav-row">
          <Link className="nav-mark" to="/home">
            Afterburner
          </Link>

          <ul className="nav-links">
            {LINKS.map((link) => (
              <li key={link.to}>
                <NavLink className="nav-link" to={link.to}>
                  {({ isActive }) => (
                    <>
                      {isActive ? (
                        <motion.span
                          className="nav-pill"
                          layoutId="nav-pill"
                          transition={pill}
                        />
                      ) : null}
                      <span className="nav-linkText">{link.label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="nav-right">
            <Link className="nav-ghost" to="/login">
              Log in
            </Link>
            <Link className="nav-cta" to="/run">
              Start a run
            </Link>
            <button
              className="nav-burger"
              type="button"
              ref={burgerRef}
              aria-expanded={open}
              aria-controls="nav-sheet"
              aria-label={open ? "Close the menu" : "Open the menu"}
              onClick={() => setOpen((current) => !current)}
            >
              <i />
              <i />
              <i />
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              key="nav-scrim"
              className="nav-scrim"
              type="button"
              aria-label="Close the menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: enter }}
              exit={{ opacity: 0, transition: leave }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              key="nav-sheet"
              id="nav-sheet"
              className="nav-sheet"
              initial={{ opacity: 0, y: still ? 0 : -8 }}
              animate={{ opacity: 1, y: 0, transition: enter }}
              exit={{ opacity: 0, y: still ? 0 : -8, transition: leave }}
            >
              <ul className="nav-sheetList">
                {LINKS.map((link) => (
                  <li key={link.to}>
                    <NavLink className="nav-sheetLink" to={link.to}>
                      {link.label}
                    </NavLink>
                  </li>
                ))}
                <li>
                  <NavLink className="nav-sheetLink" to="/login">
                    Log in
                  </NavLink>
                </li>
              </ul>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
