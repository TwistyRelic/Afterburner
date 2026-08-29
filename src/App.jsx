import { useState } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import Backdrop from "./Backdrop.jsx";
import Strip from "./Strip.jsx";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Screen from "./pages/Screen.jsx";
import Sessions from "./pages/Sessions.jsx";

// The screen at /screen is a single handed-over view, so it opts out of the
// shared backdrop and top strip.
function Shell() {
  return (
    <>
      <Backdrop />
      <Strip />
      <Outlet />
    </>
  );
}

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
    <Routes>
      <Route path="/screen" element={<Screen />} />
      <Route element={<Shell />}>
        <Route path="/" element={<Landing />} />
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
      </Route>
    </Routes>
  );
}
