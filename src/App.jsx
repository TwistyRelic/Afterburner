import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Backdrop from "./Backdrop.jsx";
import Strip from "./Strip.jsx";
import Screen from "./pages/Screen.jsx";
import Sessions from "./pages/Sessions.jsx";
import { run } from "./run.js";

export default function App() {
  const [logged, setLogged] = useState([]);

  const logNote = (note) => {
    const now = new Date();
    setLogged((current) => [
      {
        id: `${now.getTime()}-${current.length}`,
        name: "You",
        time: now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        note: `"${note}"`,
        // The note was spoken during this run, so the coach reply on it is
        // computed from this run's splits rather than from nothing.
        splits: run.splits,
        markers: "CK, CRP",
      },
      ...current,
    ]);
  };

  return (
    <Routes>
      <Route path="/" element={<Screen onLog={logNote} />} />
      <Route
        path="/sessions"
        element={
          <>
            <Backdrop />
            <Strip />
            <Sessions logged={logged} onLog={logNote} />
          </>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
