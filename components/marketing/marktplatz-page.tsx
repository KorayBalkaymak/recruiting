import Link from "next/link";
import type { PublicMarketplaceFilter } from "@/lib/marketplace/public-profiles";
import { listPublicMarketplace } from "@/lib/queries/public-marketplace";

export async function MarktplatzPage({
  searchParams,
}: {
  searchParams: PublicMarketplaceFilter;
}) {
  const beruf = searchParams.beruf?.trim() ?? "";
  const q = searchParams.q?.trim() ?? "";
  const { profiles, roles } = await listPublicMarketplace({ beruf, q });

  return (
    <div className="landing-shell flex min-h-screen flex-col">
      <header className="landing-header landing-on-light">
        <div className="landing-wrap flex h-[4.5rem] items-center justify-between">
          <Link href="/" className="landing-ink flex items-baseline gap-2.5">
            <span className="font-heading text-[1.35rem] leading-none tracking-tight">CMS</span>
            <span className="landing-gold text-[11px] font-medium uppercase tracking-[0.22em]">Talents</span>
          </Link>
          <Link href="/login" className="text-[13px] text-ink-muted transition-colors hover:text-navy">
            Recruiter anmelden
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="landing-hero landing-on-dark">
          <div className="landing-wrap py-8 md:py-10">
            <p className="landing-index">Marktplatz</p>
            <h1 className="landing-ink font-heading mt-2 text-[1.65rem] font-normal tracking-tight sm:text-[1.9rem]">
              Freigegebene Talente entdecken
            </h1>
            <p className="landing-muted mt-2 max-w-[62ch] text-[14px] leading-6">
              Hier erscheinen ausschließlich Profile, die unser Recruiting-Team geprüft und freigegeben
              hat. Filtern Sie nach Beruf — ohne Registrierung.
            </p>
          </div>
        </section>

        <section className="landing-light landing-on-light">
          <div className="landing-wrap py-8 md:py-10">
            <form method="get" className="flex flex-col gap-4 border border-surface-border bg-white p-5 sm:flex-row sm:items-end">
              <label className="flex min-w-0 flex-1 flex-col gap-2">
                <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-navy">Beruf</span>
                <select
                  name="beruf"
                  defaultValue={beruf}
                  className="h-11 w-full border border-surface-border bg-surface-subtle px-3 text-sm text-ink focus:border-brand focus:outline-none"
                >
                  <option value="">Alle Berufe</option>
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-0 flex-[1.2] flex-col gap-2">
                <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-navy">Suche</span>
                <input
                  name="q"
                  type="search"
                  defaultValue={q}
                  placeholder="z. B. TypeScript, Köln, Controlling"
                  className="h-11 w-full border border-surface-border bg-surface-subtle px-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none"
                />
              </label>
              <button type="submit" className="landing-cta sm:mb-0">
                Filtern
              </button>
            </form>

            <p className="mt-8 text-[13px] text-ink-muted">
              {profiles.length === 1
                ? "1 freigegebenes Profil"
                : `${profiles.length} freigegebene Profile`}
            </p>

            {profiles.length === 0 ? (
              <div className="mt-8 border border-surface-border bg-surface-subtle px-6 py-14 text-center">
                <p className="font-heading text-xl text-navy">Keine passenden Profile</p>
                <p className="mx-auto mt-3 max-w-[42ch] text-[15px] leading-7 text-ink-muted">
                  Es sind gerade keine freigegebenen Profile für diesen Filter sichtbar. Unser Team
                  veröffentlicht geprüfte Talente, sobald sie freigegeben sind.
                </p>
              </div>
            ) : (
              <ul className="mt-8 grid gap-5 sm:grid-cols-2">
                {profiles.map((profile) => (
                  <li
                    key={`${profile.displayName}-${profile.desiredRole}-${profile.city}`}
                    className="landing-mandate-card"
                  >
                    <p className="landing-gold text-[11px] font-medium uppercase tracking-[0.16em]">
                      {profile.desiredRole || "Profil"}
                    </p>
                    <h2 className="landing-ink font-heading text-[1.45rem] font-normal tracking-tight">
                      {profile.displayName}
                    </h2>
                    <p className="text-[13px] text-ink-muted">
                      {[profile.city, profile.country].filter(Boolean).join(", ") || "Standort auf Anfrage"}
                      {profile.yearsExperience != null
                        ? ` · ${profile.yearsExperience} Jahre Erfahrung`
                        : ""}
                    </p>
                    {profile.summary ? (
                      <p className="text-[15px] leading-7 text-ink-muted">{profile.summary}</p>
                    ) : null}
                    {profile.skills.length > 0 ? (
                      <ul className="mt-auto flex flex-wrap gap-2 pt-2">
                        {profile.skills.map((skill) => (
                          <li
                            key={skill}
                            className="border border-surface-border px-2 py-1 text-[11px] uppercase tracking-[0.08em] text-navy"
                          >
                            {skill}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-wrap flex flex-col gap-2 py-8 text-[12px] sm:flex-row sm:items-center sm:justify-between">
          <p>CMS Talents</p>
          <p>Internes Recruiting und Kandidatenportal</p>
        </div>
      </footer>
    </div>
  );
}
