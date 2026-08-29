import { Link } from "react-router-dom";
import { BANDS, PHRASE } from "../talktest.js";

const CARDS = [
  {
    to: "/breath",
    title: "The breath test",
    line: "Read one sentence out loud. The phone times the speech up to your breath.",
  },
  {
    to: "/phase",
    title: "The adaptive ghost",
    line: "The ghost repaces itself to the pace your last reading puts in your target zone.",
  },
  {
    to: "/",
    title: "The run view",
    line: "Zone, measured pace, and the gap to the ghost on one portrait screen.",
  },
  {
    to: "/sessions",
    title: "Sessions",
    line: "Every reading kept on this phone: seconds spoken, zone, pace.",
  },
];

export default function Home() {
  return (
    <div className="page">
      <h1 className="hero">A pacer that listens to you breathe.</h1>
      <p className="lede">
        Read one short sentence out loud while you run. Afterburner measures how
        long you can speak between breaths, turns that into a zone from 1 to 5,
        and repaces the ghost runner around it.
      </p>
      <p className="phrase phrase-quiet">{PHRASE}</p>
      <Link className="cta" to="/">
        Start a run
      </Link>

      <ul className="cards cards-stack">
        {CARDS.map((card) => (
          <li key={card.title}>
            <Link className="feature" to={card.to}>
              <span className="feature-title">{card.title}</span>
              <span className="feature-line">{card.line}</span>
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="subtitle">The five zones</h2>
      <ul className="bands">
        {BANDS.map((band) => (
          <li className="band" key={band.zone}>
            <span className="band-zone">{band.zone}</span>
            <span className="band-label">{band.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
