import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Backdrop from "./Backdrop.jsx";
import Strip from "./Strip.jsx";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Sessions from "./pages/Sessions.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const [logged, setLogged] = useState([]);

  const logNote = (note) => {
    const now = new Date();
    setLogged((current) => [
      {
        id: `${now.getTime()}-${current.length}`,
        name: user?.name ?? "You",
        time: now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        note: `"${note}"`,
      },
      ...current,
    ]);
  };

  return (
    <>
      <Backdrop />
      <Strip />
      <Routes>
        <Route
          path="/"
          element={<Landing user={user} logged={logged} onLog={logNote} />}
        />
        <Route path="/login" element={<Login onEnter={setUser} />} />
        <Route
          path="/sessions"
          element={
            <Sessions
              user={user}
              logged={logged}
              onLog={logNote}
              onSignOut={() => setUser(null)}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
