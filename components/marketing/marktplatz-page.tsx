import Link from "next/link";
import type { PublicMarketplaceFilter } from "@/lib/marketplace/public-profiles";
import { listPublicMarketplace } from "@/lib/queries/public-marketplace";
import { MarktplatzGallery } from "@/components/marketing/marktplatz-gallery";

export async function MarktplatzPage({
  searchParams,
}: {
  searchParams: PublicMarketplaceFilter;
}) {
  const beruf = searchParams.beruf?.trim() ?? "";
  const q = searchParams.q?.trim() ?? "";
  const { profiles, roles } = await listPublicMarketplace({ beruf, q });

  return (
    <div className="marktplatz-atelier flex min-h-screen flex-col">
      <header className="mx-header">
        <div className="mx-wrap flex h-[4.75rem] items-center justify-between">
          <Link href="/" className="mx-logo">
            <span>CMS</span>
            <span>Talents</span>
          </Link>
          <Link href="/login" className="mx-nav-link">
            Recruiter anmelden
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-hero">
          <div className="mx-wrap mx-hero-inner">
            <p className="mx-kicker mx-kicker-on-dark">
              CMS Talents | Exklusive Karrieremöglichkeiten
            </p>
            <h1 className="mx-hero-title">
              Mandate, die zur nächsten
              <span> Verantwortung passen.</span>
            </h1>
            <p className="mx-hero-copy">
              Wir verbinden ausgewählte Fach- und Führungskräfte mit anspruchsvollen
              Karriereperspektiven und exklusiven Mandaten.
            </p>
          </div>
        </section>

        <section className="mx-stage">
          <div className="mx-wrap py-12 md:py-16">
            <form method="get" className="mx-filter">
              <label className="mx-field">
                <span>Beruf</span>
                <select name="beruf" defaultValue={beruf}>
                  <option value="">Alle Berufe</option>
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mx-field mx-field-grow">
                <span>Suche</span>
                <input
                  name="q"
                  type="search"
                  defaultValue={q}
                  placeholder="Kompetenz, Stadt, Schwerpunkt"
                />
              </label>
              <button type="submit" className="mx-cta mx-cta-compact">
                Auswahl zeigen
              </button>
            </form>

            <div className="mx-count">
              <span>
                {profiles.length === 1
                  ? "Ein freigegebenes Profil"
                  : `${profiles.length} freigegebene Profile`}
              </span>
              <span>Nur intern geprüfte, freigegebene Talente</span>
            </div>

            <MarktplatzGallery profiles={profiles} />
          </div>
        </section>
      </main>

      <footer className="mx-footer">
        <div className="mx-wrap flex flex-col gap-2 py-8 text-[12px] sm:flex-row sm:items-center sm:justify-between">
          <p>CMS Talents</p>
          <p>Exklusive Mandate. Geprüfte Profile.</p>
        </div>
      </footer>
    </div>
  );
}
