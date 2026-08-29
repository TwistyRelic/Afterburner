import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { motion } from "framer-motion";
import Slideshow from "../Slideshow.jsx";
import Waitlist from "../Waitlist.jsx";

export default function Landing() {
  const heroRef = useRef(null);

  useEffect(() => {
    const context = gsap.context(() => {
      gsap.from("[data-hero-item]", {
        y: 22,
        opacity: 0,
        duration: 0.6,
        stagger: 0.12,
        ease: "power2.out",
      });
    }, heroRef);
    return () => context.revert();
  }, []);

  return (
    <main>
      <header className="hero" ref={heroRef}>
        <h1 data-hero-item>Afterburner</h1>
        <p className="subtitle" data-hero-item>
          Speak while you train
        </p>
        <p className="tagline" data-hero-item>
          Get a protocol before you sit down.
        </p>
        <div className="hero-actions" data-hero-item>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link className="button primary" to="/login">
              Log in
            </Link>
          </motion.div>
          <Link className="button ghost" to="/sessions">
            Continue as visitor
          </Link>
        </div>
      </header>

      <h2>What it does</h2>
      <Slideshow />

      <h2>Waitlist</h2>
      <Waitlist />

      <footer>
        Built at RUN/HACK London — voice on the track, Devin on the repo.
      </footer>
    </main>
  );
}
