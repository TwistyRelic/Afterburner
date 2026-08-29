import { useCallback, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Navbar from "./Navbar.jsx";
import TabBar from "./TabBar.jsx";
import Account from "./pages/Account.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Backdrop from "./Backdrop.jsx";
import Strip from "./Strip.jsx";
import Analysis from "./pages/Analysis.jsx";
import Breath from "./pages/Breath.jsx";
import Features from "./pages/Features.jsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Pace from "./pages/Pace.jsx";
import Pricing from "./pages/Pricing.jsx";
import Screen from "./pages/Screen.jsx";
import Sessions from "./pages/Sessions.jsx";
import { DUR, EASE, exitDuration, useReducedMotion } from "./motion.js";

// Three shell shapes. "app" is the live run view, which is one locked viewport
// and insets itself under the bar rather than scrolling. "site" lets a hero run
// full bleed under the glass. "doc" is a reading page that starts below it.
const SHELLS = {
  "/": "app",
  "/run": "app",
  // The ghost view is its own locked viewport and gives the bar its clearance
  // out of its own padding, so it does not want the doc shell's top offset.
  "/pace": "app",
  "/home": "site",
  "/features": "site",
  "/pricing": "site",
  "/sessions": "doc",
  "/login": "doc",
  "/breath": "doc",
  "/analysis": "doc",
  "/dashboard": "doc",
  "/account": "doc",
};

export default function App() {
  const location = useLocation();
  const still = useReducedMotion();
  const [logged, setLogged] = useState([]);

  const logNote = useCallback((note) => {
    const now = new Date();
    setLogged((current) => [
      {
        id: now.getTime() + "-" + current.length,
        name: "You",
        time: now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        note: '"' + note + '"',
      },
      ...current,
    ]);
  }, []);

  const shell = SHELLS[location.pathname] || "site";

  // The backdrop is a fixed canvas, so it is mounted outside the animated
  // wrapper. A transform on an ancestor would make it position against that
  // wrapper instead of the viewport and it would stop tracking the scroll.
  const wantsBackdrop = location.pathname === "/sessions";

  const enter = { duration: still ? 0 : DUR.page, ease: EASE };
  const leave = { duration: still ? 0 : exitDuration(DUR.page), ease: EASE };

  return (
    <>
      <Navbar />
      {wantsBackdrop ? <Backdrop /> : null}

      {/* initial={false} so the first paint is the settled state. A reveal that
          has to animate in is a blank section in any browser that does not run
          the animation. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          id="ab-main"
          className="shell"
          data-shell={shell}
          tabIndex={-1}
          initial={{ opacity: 0, y: still ? 0 : 12 }}
          animate={{ opacity: 1, y: 0, transition: enter }}
          exit={{ opacity: 0, y: still ? 0 : -6, transition: leave }}
        >
          <Routes location={location}>
            {/* The run view answers on both paths. "/" is the entry a judge is
                handed the phone on, and "/run" is a stable deep link that stays
                right if "/" is ever given to something else. Every link into
                the run view uses "/run". */}
            <Route path="/" element={<Screen onLog={logNote} />} />
            <Route path="/run" element={<Screen onLog={logNote} />} />
            <Route path="/pace" element={<Pace />} />
            <Route path="/home" element={<Home />} />
            <Route path="/features" element={<Features />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/breath" element={<Breath />} />
            <Route path="/analysis" element={<Analysis />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/account" element={<Account />} />
            <Route
              path="/sessions"
              element={
                <>
                  <Strip />
                  <Sessions logged={logged} onLog={logNote} />
                </>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </motion.div>
      </AnimatePresence>

      <TabBar />
    </>
  );
}
