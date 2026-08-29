import { Link, NavLink, Outlet } from "react-router-dom";

// The public pages sit inside the same shell as the run views, so the tab bar is
// present on every screen. This layout only adds the page-level nav above them.
const LINKS = [
  { to: "/home", label: "Home" },
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/login", label: "Log in" },
  { to: "/account", label: "You" },
];

export default function Public() {
  return (
    <div className="public">
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
      <Outlet />
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
