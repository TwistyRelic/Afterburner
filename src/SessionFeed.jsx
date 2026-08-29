import LogNote from "./LogNote.jsx";
import SessionCard from "./SessionCard.jsx";
import { sessions } from "./sessions.js";

export default function SessionFeed({ logged, onLog }) {
  return (
    <>
      <LogNote onLog={onLog} />

      {[...logged, ...sessions].map((session, index) => (
        <SessionCard
          key={session.id ?? session.name}
          session={session}
          index={index}
        />
      ))}
    </>
  );
}
