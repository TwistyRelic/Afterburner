import { Link } from "react-router-dom";
import BuiltItself from "../BuiltItself.jsx";
import HonestyDial from "../HonestyDial.jsx";
import LogNote from "../LogNote.jsx";
import Markers from "../Markers.jsx";
import SessionCard from "../SessionCard.jsx";
import { sessions } from "../sessions.js";

export default function Sessions({ logged, onLog }) {
  return (
    <main>
      <div className="signed-in">
        <span>Session log</span>
        <Link className="button ghost small" to="/">
          Back to live
        </Link>
      </div>

      <Markers />

      <HonestyDial />

      <LogNote onLog={onLog} />

      {[...logged, ...sessions].map((session, index) => (
        <SessionCard
          key={session.id ?? session.name}
          session={session}
          index={index}
        />
      ))}

      <BuiltItself />
    </main>
  );
}
