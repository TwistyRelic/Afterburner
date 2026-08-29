import { useState } from "react";
import Capture from "../Capture.jsx";
import ZoneDial from "../ZoneDial.jsx";
import { useRun } from "../RunContext.jsx";
import { BANDS, bandRange, formatSeconds } from "../talktest.js";

export default function Breath() {
  const { latest } = useRun();
  const [taken, setTaken] = useState(null);
  const reading = taken ?? latest;
  const range = reading ? bandRange(reading.zone) : null;

  return (
    <div className="page">
      <h1 className="title">The breath test</h1>
      <p className="lede">
        Read the sentence out loud while you run. Afterburner times the speech
        up to your breath and reads a zone off that one number.
      </p>

      <Capture onReading={setTaken} />

      <ZoneDial
        zone={reading?.zone ?? null}
        seconds={reading?.seconds ?? null}
      />

      {reading && range ? (
        <p className="evidence">
          {formatSeconds(reading.seconds)} of speech falls in zone{" "}
          {reading.zone}
          {range.to
            ? ` (${range.from}–${range.to} s)`
            : ` (${range.from} s or more)`}
          .
        </p>
      ) : null}

      <ul className="bands">
        {BANDS.map((band) => {
          const span = bandRange(band.zone);
          return (
            <li
              className={reading?.zone === band.zone ? "band band-on" : "band"}
              key={band.zone}
            >
              <span className="band-zone">{band.zone}</span>
              <span className="band-label">{band.label}</span>
              <span className="band-range">
                {span.to ? `${span.from}–${span.to} s` : `${span.from} s +`}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="fine">
        This is the talk test, a long-standing field method in exercise
        physiology. It is not a lactate test, it is not a VO2 max test, and it
        diagnoses nothing.
      </p>
    </div>
  );
}
