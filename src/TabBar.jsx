import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

// The five things you can do, in the order you do them. A bottom bar rather
// than a top nav because this is used on a phone, in a hand, while moving:
// every target has to be inside thumb reach.
export const TABS = [
  { to: "/dashboard", label: "Home", glyph: "home" },
  { to: "/breath", label: "Breath", glyph: "wave" },
  { to: "/ghost", label: "Run", glyph: "run" },
  { to: "/analysis", label: "Score", glyph: "log" },
  { to: "/account", label: "You", glyph: "you" },
];

const Glyph = ({ name }) => {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", strokeWidth: 1.8,
    stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" };
  if (name === "home") return <svg {...common}><path d="M3 10.5 12 3l9 7.5" /><path d="M5.5 9.5V20h13V9.5" /></svg>;
  if (name === "wave") return <svg {...common}><path d="M2 12h3l2.5-7 4 14L14 8l2 4h6" /></svg>;
  if (name === "run") return <svg {...common}><circle cx="15" cy="4.5" r="2" /><path d="M9 21l2.5-5.5L9 12l1-5 4 2 2.5 3H20" /><path d="M4 14h3l2-2" /></svg>;
  if (name === "log") return <svg {...common}><path d="M5 4h11l3 3v13H5z" /><path d="M8 10h8M8 14h8M8 18h5" /></svg>;
  return <svg {...common}><circle cx="12" cy="8" r="3.4" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></svg>;
};

export default function TabBar() {
  const location = useLocation();

  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((tab) => {
        const active = location.pathname === tab.to;
        return (
          <NavLink key={tab.to} to={tab.to} className={active ? "tab on" : "tab"}>
            {active && (
              <motion.span
                layoutId="tab-pill"
                className="tab-pill"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="tab-inner">
              <Glyph name={tab.glyph} />
              <span className="tab-label">{tab.label}</span>
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
}
