import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import {
  fetchSpeech,
  readKey,
  readVoice,
  splitWords,
  wordStagger,
} from "./voiceout.js";

const storage = () =>
  typeof window === "undefined" ? null : window.localStorage;

export default function CoachVoice({ text, speak = false }) {
  const wordsRef = useRef(null);
  const audioRef = useRef(null);
  const [source, setSource] = useState("");
  const words = splitWords(text);

  useEffect(() => {
    const host = wordsRef.current;
    if (!host) return undefined;
    const spans = host.querySelectorAll(".coach-word");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const reveal = gsap.fromTo(
      spans,
      { opacity: 0, y: 6 },
      {
        opacity: 1,
        y: 0,
        duration: 0.28,
        ease: "power2.out",
        stagger: wordStagger(text),
      },
    );
    if (still) reveal.progress(1).pause();
    return () => reveal.kill();
  }, [text]);

  useEffect(() => {
    if (!speak || !text) return undefined;
    let cancelled = false;

    // The synthesiser is the floor: it runs when there is no key, when the
    // request fails, and when the browser refuses to play the fetched audio.
    const synthesise = () => {
      const synth = window.speechSynthesis;
      if (!synth || cancelled) return;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-GB";
      utterance.rate = 1.02;
      synth.cancel();
      synth.speak(utterance);
      setSource("browser voice");
    };

    const play = async () => {
      const key = readKey(storage());
      if (!key || typeof fetch !== "function") {
        synthesise();
        return;
      }
      try {
        const blob = await fetchSpeech(
          text,
          key,
          readVoice(storage()),
          (...args) => fetch(...args),
        );
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => URL.revokeObjectURL(url);
        audioRef.current = audio;
        await audio.play();
        setSource("ElevenLabs");
      } catch {
        synthesise();
      }
    };

    play();

    return () => {
      cancelled = true;
      window.speechSynthesis?.cancel();
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [speak, text]);

  return (
    <p className="coach-text" ref={wordsRef}>
      {words.map((word, index) => (
        <span className="coach-word" key={`${word}-${index}`}>
          {word}{" "}
        </span>
      ))}
      {source ? <span className="coach-spoken">Spoken · {source}</span> : null}
    </p>
  );
}
