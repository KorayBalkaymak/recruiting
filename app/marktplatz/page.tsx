import Link from "next/link";

const mandates = [
  {
    n: "01",
    title: "Fach- und Führungskräfte",
    text: "Rollen, die ein Unternehmen tragen — fachlich präzise, kulturell anschlussfähig, wirtschaftlich begründet.",
  },
  {
    n: "02",
    title: "Operative Schlüsselpositionen",
    text: "Besetzungen, in denen Alltag und Verantwortung zusammenfallen. Kein Keyword-Matching, sondern Passung zur Aufgabe.",
  },
  {
    n: "03",
    title: "Projekt- und Interimsmandate",
    text: "Zeitlich klare Einsätze, intern geprüft, bevor ein Profil den Kunden erreicht.",
  },
];

export default function MarktplatzPage() {
  return (
    <div className="landing-shell min-h-screen">
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

      <main>
        <section className="landing-hero landing-on-dark">
          <div className="landing-wrap pb-20 pt-20 md:pb-28 md:pt-24">
            <p className="landing-index">Markt</p>
            <h1 className="landing-ink font-heading mt-6 max-w-[14ch] text-[clamp(2.4rem,5.6vw,4.6rem)] font-normal leading-[1.04] tracking-[-0.03em]">
              Mandate, die zum Profil passen.
            </h1>
            <p className="landing-muted mt-8 max-w-[42ch] text-[16px] leading-7">
              Kein öffentlicher Stellenmarkt. Ein kuratierter Überblick über die Art von Besetzungen, für die CMS Talents Profile prüft.
            </p>
          </div>
        </section>

        <section className="landing-light landing-on-light">
          <div className="landing-wrap py-20 md:py-28">
            <ul className="grid gap-0 border-t border-surface-border">
              {mandates.map((item) => (
                <li
                  key={item.n}
                  className="grid gap-3 border-b border-surface-border py-10 md:grid-cols-12 md:items-start md:gap-8 md:py-12"
                >
                  <p className="landing-gold font-heading text-sm md:col-span-2">{item.n}</p>
                  <h2 className="landing-ink font-heading text-[1.45rem] font-normal tracking-tight md:col-span-4">
                    {item.title}
                  </h2>
                  <p className="text-[15px] leading-7 text-ink-muted md:col-span-6">{item.text}</p>
                </li>
              ))}
            </ul>

            <div className="mt-16 flex flex-wrap items-center gap-4">
              <Link href="/candidate/register" className="landing-cta">
                Als Talent registrieren
              </Link>
              <Link
                href="/"
                className="text-[13px] font-medium uppercase tracking-[0.04em] text-ink-muted transition-colors hover:text-navy"
              >
                Zurück zur Startseite
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
