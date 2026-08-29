import { motion } from "framer-motion";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";

const LINKS = [
  { to: "/home", label: "Home" },
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/login", label: "Log in" },
];

export default function Public() {
  const { pathname } = useLocation();
  return (
    <div className="app">
      <header className="public-top">
        <Link className="wordmark" to="/home">
          Afterburner
        </Link>
        <nav className="public-nav" aria-label="Pages">
          {LINKS.map((link) => (
            <NavLink
              className={({ isActive }) =>
                isActive ? "public-link public-link-on" : "public-link"
              }
              key={link.to}
              to={link.to}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <motion.main
        className="app-body public-body"
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
      >
        <Outlet />
      </motion.main>
      <footer className="public-foot">
        <Link className="run-link" to="/">
          Open the run view
        </Link>
        <p className="fine">
          Afterburner times how long you can speak between breaths and turns
          that into a 1–5 zone. That is the talk test, a long-standing field
          method in exercise physiology. It is not a lactate test, it is not a
          VO2 max test, and it diagnoses nothing.
        </p>
      </footer>
    </div>
  );
}
