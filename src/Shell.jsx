import { motion } from "framer-motion";
import { NavLink, Outlet, useLocation } from "react-router-dom";

const TABS = [
  { to: "/", label: "Run" },
  { to: "/breath", label: "Breath" },
  { to: "/phase", label: "Ghost" },
  { to: "/sessions", label: "Sessions" },
  { to: "/account", label: "You" },
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
        {TABS.map((tab) => (
          <NavLink
            className={({ isActive }) => (isActive ? "tab tab-on" : "tab")}
            end={tab.to === "/"}
            key={tab.to}
            to={tab.to}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
