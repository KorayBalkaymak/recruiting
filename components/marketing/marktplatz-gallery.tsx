"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import type { PublicMarketplaceProfile } from "@/lib/marketplace/public-profiles";

function pad(index: number) {
  return String(index + 1).padStart(2, "0");
}

function locationLine(profile: PublicMarketplaceProfile) {
  return [profile.city, profile.country].filter(Boolean).join(", ") || "Standort auf Anfrage";
}

function experienceLine(profile: PublicMarketplaceProfile) {
  if (profile.yearsExperience == null) return null;
  return profile.yearsExperience === 1
    ? "1 Jahr Erfahrung"
    : `${profile.yearsExperience} Jahre Erfahrung`;
}

export function MarktplatzGallery({ profiles }: { profiles: PublicMarketplaceProfile[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const titleId = useId();
  const open = openIndex != null ? profiles[openIndex] : null;

  useEffect(() => {
    if (openIndex == null) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenIndex(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [openIndex]);

  if (profiles.length === 0) {
    return (
      <div className="mx-empty">
        <p className="mx-kicker">Auswahl</p>
        <h2 className="mx-empty-title">Derzeit keine passenden Profile</h2>
        <p className="mx-empty-copy">
          Es sind gerade keine freigegebenen Profile für diesen Filter sichtbar. Unser Team
          veröffentlicht geprüfte Talente, sobald sie für Mandate freigegeben sind.
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="mx-grid">
        {profiles.map((profile, index) => {
          const featured = index === 0;
          return (
            <li
              key={`${profile.displayName}-${profile.desiredRole}-${profile.city}-${index}`}
              className={featured ? "mx-card mx-card-featured" : "mx-card"}
              style={{ ["--i" as string]: index }}
            >
              <div className="mx-card-top">
                <span className="mx-card-index">{pad(index)}</span>
                <span className="mx-card-role">{profile.desiredRole || "Mandat"}</span>
              </div>
              <h2 className="mx-card-title">{profile.displayName}</h2>
              <p className="mx-card-meta">
                {locationLine(profile)}
                {experienceLine(profile) ? ` · ${experienceLine(profile)}` : ""}
              </p>
              {profile.summary ? <p className="mx-card-copy">{profile.summary}</p> : null}
              {profile.skills.length > 0 ? (
                <ul className="mx-chips">
                  {profile.skills.slice(0, featured ? 6 : 4).map((skill) => (
                    <li key={skill}>{skill}</li>
                  ))}
                </ul>
              ) : null}
              <button type="button" className="mx-card-cta" onClick={() => setOpenIndex(index)}>
                Mandat entdecken
              </button>
            </li>
          );
        })}
      </ul>

      {open ? (
        <div className="mx-detail" role="presentation" onClick={() => setOpenIndex(null)}>
          <div
            className="mx-detail-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" className="mx-detail-close" onClick={() => setOpenIndex(null)}>
              Schließen
            </button>
            <p className="mx-kicker">Exklusives Mandat</p>
            <h2 id={titleId} className="mx-detail-title">
              {open.desiredRole || "Freigegebenes Profil"}
            </h2>
            <p className="mx-detail-person">{open.displayName}</p>
            <p className="mx-detail-meta">
              {locationLine(open)}
              {experienceLine(open) ? ` · ${experienceLine(open)}` : ""}
            </p>

            <div className="mx-detail-body">
              {open.summary ? (
                <section>
                  <h3>Mandat</h3>
                  <p>{open.summary}</p>
                </section>
              ) : null}
              {open.skills.length > 0 ? (
                <section>
                  <h3>Fachliche Schwerpunkte</h3>
                  <ul className="mx-chips mx-chips-on-dark">
                    {open.skills.map((skill) => (
                      <li key={skill}>{skill}</li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>

            <Link href="/candidate/register" className="mx-cta">
              Interesse bekunden
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
