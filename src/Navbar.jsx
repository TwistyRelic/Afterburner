import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

const KEY = "afterburner.account";

const signedIn = () => {
  try {
    return Boolean(JSON.parse(window.localStorage.getItem(KEY) || "{}").name);
  } catch {
    return false;
  }
};

const GUEST = [
  { to: "/", label: "Home" },
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
];

const MEMBER = [
  { to: "/dashboard", label: "Home", glyph: "home" },
  { to: "/breath", label: "Breath", glyph: "wave" },
  { to: "/ghost", label: "Run", glyph: "run" },
  { to: "/analysis", label: "Score", glyph: "score" },
  { to: "/account", label: "You", glyph: "you" },
];

const Glyph = ({ name }) => {
  const c = {
    width: 19, height: 19, viewBox: "0 0 24 24", fill: "none", strokeWidth: 1.9,
    stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round",
  };
  if (name === "home") return <svg {...c}><path d="M3 10.5 12 3l9 7.5" /><path d="M5.5 9.5V20h13V9.5" /></svg>;
  if (name === "wave") return <svg {...c}><path d="M2 12h3l2.5-7 4 14L14 8l2 4h6" /></svg>;
  if (name === "run") return <svg {...c}><circle cx="15" cy="4.5" r="2" /><path d="M9 21l2.5-5.5L9 12l1-5 4 2 2.5 3H20" /><path d="M4 14h3l2-2" /></svg>;
  if (name === "score") return <svg {...c}><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2" /></svg>;
  return <svg {...c}><circle cx="12" cy="8" r="3.4" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></svg>;
};

export default function Navbar() {
  const location = useLocation();
  const [compact, setCompact] = useState(false);
  const [member, setMember] = useState(signedIn());

  useEffect(() => setMember(signedIn()), [location.pathname]);

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const items = member ? MEMBER : GUEST;

  return (
    <nav className={compact ? "nb compact" : "nb"} aria-label="Main">
      <Link to={member ? "/dashboard" : "/"} className="nb-brand">
        <span className="nb-dot" aria-hidden="true" />
        Afterburner
      </Link>

      <div className="nb-links">
        {items.map((it) => {
          const on = location.pathname === it.to;
          return (
            <NavLink key={it.to} to={it.to} className={on ? "nb-link on" : "nb-link"}>
              {on && (
                <motion.span
                  layoutId="nb-pill"
                  className="nb-pill"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span className="nb-inner">
                {member && <Glyph name={it.glyph} />}
                <span className="nb-label">{it.label}</span>
              </span>
            </NavLink>
          );
        })}
      </div>

      {!member && (
        <Link to="/login" className="nb-cta">
          Start
        </Link>
      )}
    </nav>
  );
}
