"use client";

import { useEffect, useRef } from "react";

const paragraphs = [
  "CMS Talents ist die Recruiting-Marke von CMS für anspruchsvolle Besetzungen im B2B: Fach- und Führungskräfte, die in ein Unternehmen wirklich hineinpassen — fachlich, kulturell und wirtschaftlich. Wir vermitteln nicht nach Keyword-Liste, sondern nach dem, was die Rolle im Alltag trägt.",
  "Hinter der Marke steht ein internes Team aus Recruiting, Key Account und Geschäftsleitung. Mandate, Vakanzen und Kandidaten laufen in einer gemeinsamen Pipeline: nachvollziehbar, ohne Massenversand, ohne unklare Lebensläufe. Jedes Profil wird geprüft, bevor es zum Kunden geht.",
  "Talente arbeiten in einem eigenen Portal: Profil pflegen, Unterlagen einreichen, Status sehen. Der Kunden- und Mandatsbereich bleibt intern. So bleibt die Zusammenarbeit klar getrennt — professionell für Bewerberinnen und Bewerber, steuerbar für das CMS-Team.",
];

export function AboutSection() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.classList.add("is-in");
          observer.disconnect();
        }
      },
      { threshold: 0.22 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="landing-about border-t border-white/10">
      <div className="landing-about-glow" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <p className="landing-about-kicker">
          <span className="landing-about-kicker-line" aria-hidden />
          Die Marke
        </p>
        <h2 className="font-heading landing-about-title mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-6xl">
          <span className="landing-about-line">Was CMS Talents</span>
          <span className="landing-about-line landing-about-title-accent">wirklich macht.</span>
        </h2>
        <ul className="landing-about-roles mt-8 flex flex-wrap gap-2 sm:gap-3" aria-label="Schwerpunkte">
          {["Passung finden", "Profile prüfen", "Mandate besetzen"].map((label) => (
            <li key={label} className="landing-about-role">
              {label}
            </li>
          ))}
        </ul>
        <div className="landing-about-copy mt-12 max-w-3xl space-y-6 text-base leading-relaxed text-white/68 sm:text-lg">
          {paragraphs.map((text, index) => (
            <p key={index} style={{ ["--i" as string]: index }}>
              {text}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
