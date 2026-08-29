import { motion } from "framer-motion";
import { NavLink, Outlet, useLocation } from "react-router-dom";

// One tab bar for every screen, public pages included. The pill is a single
// element shared across the tabs, so Framer Motion slides it from the old tab to
// the new one instead of cross-fading two pills.
const TABS = [
  { to: "/home", label: "Home" },
  { to: "/breath", label: "Breath" },
  { to: "/", label: "Run" },
  { to: "/sessions", label: "Log" },
  { to: "/phase", label: "View" },
];

export default function Shell() {
  const { pathname } = useLocation();
  return (
    <div className="app">
      <motion.main
        className="app-body"
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
      >
        <Outlet />
      </motion.main>
      <nav className="tabs" aria-label="Sections">
        <div className="tabs-row">
          {TABS.map((tab) => (
            <NavLink
              className={({ isActive }) => (isActive ? "tab tab-on" : "tab")}
              end={tab.to === "/"}
              key={tab.to}
              to={tab.to}
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <motion.span
                      className="tab-pill"
                      layoutId="tab-pill"
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 34,
                      }}
                    />
                  ) : null}
                  <span className="tab-label">{tab.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
