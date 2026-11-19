import Link from "next/link";
import { AboutSection } from "@/components/marketing/about-section";
import { PrinciplesSection } from "@/components/marketing/principles-section";

const steps = [
  { n: "01", title: "Verstehen", text: "Rolle, Markt und Erwartung des Kunden werden festgehalten — nicht nur ein Jobtitel." },
  { n: "02", title: "Prüfen", text: "Talente reichen über das Portal ein. Unser Team bewertet Passung, Unterlagen und Verfügbarkeit." },
  { n: "03", title: "Platzieren", text: "Nur freigegebene Profile gehen an den Kunden. Jede Einreichung bleibt dokumentiert." },
];

export function HomePage() {
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
          <div className="landing-wrap pb-24 pt-24 md:pb-32 md:pt-28">
            <h1 className="landing-ink font-heading max-w-[16ch] text-[clamp(2.6rem,6.4vw,5.4rem)] font-normal leading-[1.04] tracking-[-0.03em]">
              Talente, die zum Geschäft passen.
            </h1>
            <p className="landing-muted mt-8 max-w-[38ch] text-[16px] leading-7">
              Nicht zur Stellenanzeige. Sondern zur Rolle, wie sie im Alltag wirklich getragen wird.
            </p>
            <div className="landing-hero-actions">
              <Link href="/marktplatz" className="landing-cta">
                Mandate entdecken
              </Link>
              <Link href="/candidate/register" className="landing-cta-ghost">
                Als Talent registrieren
              </Link>
            </div>
          </div>
        </section>

        <AboutSection />

        <PrinciplesSection />

        <section className="landing-light landing-on-light">
          <div className="landing-wrap py-24 md:py-32">
            <h2 className="landing-ink font-heading max-w-[16ch] text-[2rem] font-normal leading-[1.15] tracking-[-0.02em] sm:text-[2.5rem]">
              Drei Schritte. Kein Rauschen.
            </h2>
            <ol className="mt-16 grid gap-12 md:grid-cols-3 md:gap-16">
              {steps.map((step) => (
                <li key={step.n}>
                  <p className="landing-gold font-heading text-sm">{step.n}</p>
                  <span className="landing-rule mt-4 block h-px w-8" aria-hidden />
                  <h3 className="landing-ink font-heading mt-5 text-[1.65rem] font-normal tracking-tight">
                    {step.title}
                  </h3>
                  <p className="landing-muted mt-3 max-w-[34ch] text-[15px] leading-7">{step.text}</p>
                </li>
              ))}
            </ol>
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
