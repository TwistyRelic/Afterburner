import { useRun } from "../RunContext.jsx";
import { BANDS, PHRASE, bandRange } from "../talktest.js";

export default function Settings() {
  const { settings, update, paceSupported } = useRun();

  return (
    <div className="page">
      <h1 className="title">Settings</h1>

      <fieldset className="chooser">
        <legend>Target zone for the ghost</legend>
        {BANDS.map((band) => (
          <button
            className={
              settings.targetZone === band.zone ? "chip chip-on" : "chip"
            }
            key={band.zone}
            onClick={() => update({ targetZone: band.zone })}
            type="button"
          >
            {band.zone}
          </button>
        ))}
      </fieldset>

      <label className="toggle">
        <input
          checked={settings.spoken}
          onChange={(event) => update({ spoken: event.target.checked })}
          type="checkbox"
        />
        <span>Say the zone out loud after each reading</span>
      </label>

      <h2 className="subtitle">The sentence you read</h2>
      <p className="phrase phrase-quiet">{PHRASE}</p>

      <h2 className="subtitle">How a zone is read</h2>
      <ul className="bands">
        {BANDS.map((band) => {
          const span = bandRange(band.zone);
          return (
            <li className="band" key={band.zone}>
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
        Pace comes from this phone&apos;s location fixes
        {paceSupported ? "" : ", which this browser is not providing"}. Zones
        come from timed speech. Nothing here is a lactate test, a VO2 max test,
        or a diagnosis.
      </p>
    </div>
  );
}
