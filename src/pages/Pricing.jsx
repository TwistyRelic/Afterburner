import { Link } from "react-router-dom";

const PLANS = [
  {
    name: "Free",
    price: "£0",
    line: "The breath test, the zones, the ghost, and your readings on this phone.",
    items: ["Unlimited readings", "Adaptive ghost", "Local history"],
    cta: "Start a run",
    to: "/",
  },
  {
    name: "Coach",
    price: "Not yet",
    line: "Shared readings across a squad. Nothing is built, so there is nothing to charge for.",
    items: ["Squad view", "Export readings", "Session notes"],
    cta: "See what exists today",
    to: "/features",
  },
];

export default function Pricing() {
  return (
    <div className="page">
      <h1 className="title">Pricing</h1>
      <p className="lede">
        Everything that works today runs on your phone and costs nothing.
      </p>
      <ul className="cards cards-stack">
        {PLANS.map((plan) => (
          <li className="plan" key={plan.name}>
            <span className="plan-name">{plan.name}</span>
            <span className="plan-price">{plan.price}</span>
            <span className="feature-line">{plan.line}</span>
            <ul className="plan-items">
              {plan.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <Link className="cta cta-small" to={plan.to}>
              {plan.cta}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
