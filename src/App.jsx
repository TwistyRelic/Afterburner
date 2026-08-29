import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import Backdrop from "./Backdrop.jsx";
import Gate from "./Gate.jsx";
import LogNote from "./LogNote.jsx";
import SessionCard from "./SessionCard.jsx";
import Slideshow from "./Slideshow.jsx";
import Waitlist from "./Waitlist.jsx";
import { sessions } from "./sessions.js";

export default function App() {
  const heroRef = useRef(null);
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

  useEffect(() => {
    const context = gsap.context(() => {
      gsap.from("[data-hero-item]", {
        y: 18,
        opacity: 0,
        duration: 0.6,
        stagger: 0.12,
        ease: "power2.out",
      });
    }, heroRef);
    return () => context.revert();
  }, []);

  return (
    <>
      <Backdrop />
      <main>
        <header ref={heroRef}>
          <h1 data-hero-item>Afterburner</h1>
          <p className="subtitle" data-hero-item>
            Speak while you train
          </p>
          <p className="tagline" data-hero-item>
            Get a protocol before you sit down.
          </p>
        </header>

        {user === null ? (
          <Gate onEnter={setUser} />
        ) : (
          <>
            <div className="signed-in">
              <span>
                {user.kind === "visitor"
                  ? "Browsing as visitor"
                  : `Signed in as ${user.name}`}
              </span>
              <button type="button" className="ghost" onClick={() => setUser(null)}>
                {user.kind === "visitor" ? "Log in" : "Sign out"}
              </button>
            </div>

            <h2>What it does</h2>
            <Slideshow />

            <h2>Recent sessions</h2>
            <LogNote onLog={logNote} />
            {[...logged, ...sessions].map((session, index) => (
              <SessionCard
                key={session.id ?? session.name}
                session={session}
                index={index}
              />
            ))}

            <h2>Waitlist</h2>
            <Waitlist />
          </>
        )}

        <footer>
          Built at RUN/HACK London — voice on the track, Devin on the repo.
        </footer>
      </main>
    </>
  );
}
