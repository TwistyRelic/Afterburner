import { motion } from "framer-motion";
import { NavLink, Outlet, useLocation } from "react-router-dom";

// One tab bar for every screen, public pages included. The pill is a single
// element shared across the tabs, so Framer Motion slides it from the old tab to
// the new one instead of cross-fading two pills.
const TABS = [
  {
    to: "/home",
    label: "Home",
    owns: ["/features", "/pricing", "/login", "/account", "/settings"],
  },
  { to: "/breath", label: "Breath", owns: [] },
  { to: "/", label: "Run", owns: [] },
  { to: "/sessions", label: "Log", owns: [] },
  { to: "/phase", label: "View", owns: [] },
];

// Pages without a tab of their own still light the tab they were opened from, so
// the bar is never sitting there with nothing selected.
function activeTab(pathname) {
  const owner = TABS.find(
    (tab) => tab.to === pathname || tab.owns.includes(pathname),
  );
  return owner ? owner.to : "/";
}

export default function Shell() {
  const { pathname } = useLocation();
  const active = activeTab(pathname);
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
              aria-current={active === tab.to ? "page" : undefined}
              className={active === tab.to ? "tab tab-on" : "tab"}
              key={tab.to}
              to={tab.to}
            >
              {active === tab.to ? (
                <motion.span
                  className="tab-pill"
                  layoutId="tab-pill"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              ) : null}
              <span className="tab-label">{tab.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
