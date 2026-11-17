"use client";

import { useEffect, useRef } from "react";

const principles = [
  {
    n: "01",
    title: "Qualität vor Tempo",
    text: "Jedes Profil wird intern geprüft, bevor es zum Kunden geht. Keine Massenware, keine unklaren Lebensläufe.",
  },
  {
    n: "02",
    title: "Eine gemeinsame Pipeline",
    text: "Mandate, Vakanzen und Status in einem Arbeitsbereich — nachvollziehbar für Recruiter, Key Account und Geschäftsleitung.",
  },
  {
    n: "03",
    title: "Ein Portal für Talente",
    text: "Kandidaten pflegen Profil und Unterlagen selbst. Der Mandatsbereich bleibt intern — klar getrennt, professionell.",
  },
];

export function PrinciplesSection() {
  const pinRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const cardsRef = useRef<HTMLLIElement[]>([]);

  useEffect(() => {
    const pin = pinRef.current;
    const track = trackRef.current;
    const fill = fillRef.current;
    if (!pin || !track || !fill) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let frame = 0;

    const update = () => {
      frame = 0;
      const rect = pin.getBoundingClientRect();
      const travel = pin.offsetHeight - window.innerHeight;
      if (travel <= 0) return;
      const progress = Math.min(1, Math.max(0, -rect.top / travel));
      const maxShift = Math.max(0, track.scrollWidth - track.parentElement!.clientWidth);
      track.style.transform = `translate3d(${-maxShift * progress}px, 0, 0)`;
      fill.style.transform = `scaleX(${progress})`;

      const active = Math.min(principles.length - 1, Math.round(progress * (principles.length - 1)));
      cardsRef.current.forEach((card, index) => {
        if (!card) return;
        const distance = Math.abs(index - progress * (principles.length - 1));
        const closeness = Math.max(0, 1 - distance);
        card.style.opacity = String(0.28 + closeness * 0.72);
        card.style.transform = `scale(${0.92 + closeness * 0.08})`;
        card.dataset.active = index === active ? "true" : "false";
      });
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section ref={pinRef} className="principles-pin landing-hero landing-on-dark">
      <div className="principles-sticky">
        <div className="landing-wrap flex h-full flex-col justify-center py-16">
          <p className="landing-index">03 — Haltung</p>
          <h2 className="landing-ink font-heading mt-5 max-w-[16ch] text-[2rem] font-normal leading-[1.15] tracking-[-0.02em] sm:text-[2.5rem]">
            Drei Prinzipien für jede Besetzung
          </h2>

          <div className="principles-progress mt-10" aria-hidden>
            <span ref={fillRef} />
          </div>

          <div className="principles-viewport mt-12">
            <ul ref={trackRef} className="principles-track">
              {principles.map((item, index) => (
                <li
                  key={item.n}
                  ref={(node) => {
                    if (node) cardsRef.current[index] = node;
                  }}
                  className="principles-card"
                >
                  <span className="principles-num">{item.n}</span>
                  <h3 className="landing-ink font-heading mt-6 text-[1.85rem] font-normal tracking-tight sm:text-[2.15rem]">
                    {item.title}
                  </h3>
                  <p className="landing-muted mt-4 max-w-[36ch] text-[15px] leading-7">{item.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
