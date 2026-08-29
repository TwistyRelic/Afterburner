import { Link } from "react-router-dom";

const FEATURES = [
  {
    title: "One sentence, one number",
    line: "The microphone times the speech from your first word to your breath. That timed interval is the whole input.",
  },
  {
    title: "A zone from 1 to 5",
    line: "The seconds you held map onto five bands the app applies the same way every time, so today's reading is comparable to last week's.",
  },
  {
    title: "A ghost that repaces",
    line: "Give it a target zone and it holds the pace your reading says lands there, from the pace this phone measured.",
  },
  {
    title: "Measured pace, or a dash",
    line: "Pace comes from the phone's own location fixes. Before a fix arrives you see a dash, never a filled-in number.",
  },
  {
    title: "No microphone, still works",
    line: "Hold the button while you speak and release at the breath. Same interval, timed by hand.",
  },
  {
    title: "Local only",
    line: "Readings, account, and settings live in this browser. There is nothing to upload and nowhere to upload it.",
  },
];

export default function Features() {
  return (
    <div className="page">
      <h1 className="title">Features</h1>
      <ul className="cards cards-stack">
        {FEATURES.map((feature) => (
          <li className="feature feature-flat" key={feature.title}>
            <span className="feature-title">{feature.title}</span>
            <span className="feature-line">{feature.line}</span>
          </li>
        ))}
      </ul>
      <Link className="cta" to="/">
        Try it on a run
      </Link>
      <h2 className="subtitle">What it is not</h2>
      <p className="fine">
        The talk test is a field method for gauging how hard you are working
        from how easily you can speak. Afterburner times that and nothing else.
        It is not a lactate test, it is not a VO2 max test, it reports no
        accuracy figure, and it diagnoses nothing.
      </p>
    </div>
  );
}
