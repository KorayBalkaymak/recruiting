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
      { threshold: 0.18 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="landing-reveal landing-light landing-on-light">
      <div className="landing-wrap grid gap-12 py-24 md:grid-cols-12 md:gap-16 md:py-32">
        <header className="md:col-span-4 md:border-l md:border-[#7a2430] md:pl-7">
          <p className="landing-index">02 — Die Marke</p>
          <h2 className="landing-ink font-heading mt-5 text-[2rem] font-normal leading-[1.15] tracking-[-0.02em] sm:text-[2.5rem]">
            Was CMS Talents macht
          </h2>
        </header>
        <div className="landing-copy space-y-8 md:col-span-8 md:pt-10">
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
