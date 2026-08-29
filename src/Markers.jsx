import { useState } from "react";
import { disclaimer, markers } from "./markers.js";

// Three cards that flip to the education line on hover. A tap flips them too,
// because the demo is handed over on a phone where hover does not exist.
export default function Markers() {
  const [flipped, setFlipped] = useState(null);

  return (
    <section className="markers-panel" aria-labelledby="markers-heading">
      <h2 className="markers-heading" id="markers-heading">
        Markers
      </h2>
      <p className="markers-disclaimer" role="note">
        {disclaimer}
      </p>

      <ul className="marker-cards">
        {markers.map((marker) => (
          <li className="marker-card" key={marker.id}>
            <button
              className={
                flipped === marker.id
                  ? "marker-flip marker-flip-shown"
                  : "marker-flip"
              }
              type="button"
              aria-expanded={flipped === marker.id}
              onClick={() =>
                setFlipped((current) =>
                  current === marker.id ? null : marker.id,
                )
              }
            >
              <span className="marker-face marker-front">
                <span className="marker-name">{marker.name}</span>
                <span className="marker-full">{marker.full}</span>
              </span>
              <span className="marker-face marker-back">
                <span className="marker-indicates">{marker.indicates}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
