import Link from "next/link";
import { AboutSection } from "@/components/marketing/about-section";

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
          <nav className="flex items-center gap-8">
            <Link href="/candidate/login" className="landing-muted text-[13px] transition-colors hover:text-navy">
              Kandidaten
            </Link>
            <Link href="/login" className="landing-gold text-[13px] transition-colors hover:text-navy">
              Recruiter
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="landing-hero landing-on-dark">
          <div className="landing-wrap pb-24 pt-24 md:pb-32 md:pt-28">
            <p className="landing-index">01 — Recruiting</p>
            <h1 className="landing-ink font-heading mt-6 max-w-[16ch] text-[clamp(2.6rem,6.4vw,5.4rem)] font-normal leading-[1.04] tracking-[-0.03em]">
              Talente, die zum Geschäft passen.
            </h1>
            <p className="landing-muted mt-8 max-w-[38ch] text-[16px] leading-7">
              Nicht zur Stellenanzeige. Sondern zur Rolle, wie sie im Alltag wirklich getragen wird.
            </p>
          </div>
        </section>

        <AboutSection />

        <section className="landing-navy landing-on-dark">
          <div className="landing-wrap py-24 md:py-32">
            <p className="landing-index">03 — Haltung</p>
            <h2 className="landing-ink font-heading mt-5 max-w-[16ch] text-[2rem] font-normal leading-[1.15] tracking-[-0.02em] sm:text-[2.5rem]">
              Drei Prinzipien für jede Besetzung
            </h2>
            <ul className="mt-16">
              {principles.map((item, index) => (
                <li
                  key={item.n}
                  className="grid items-center gap-3 border-t border-white/15 py-10 md:grid-cols-12 md:gap-8 md:py-12"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand font-heading text-sm text-navy md:col-span-2">
                    {index + 1}
                  </span>
                  <h3 className="landing-ink font-heading text-xl font-normal tracking-tight md:col-span-4">
                    {item.title}
                  </h3>
                  <p className="landing-muted text-[15px] leading-7 md:col-span-6">{item.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="landing-light landing-on-light">
          <div className="landing-wrap py-24 md:py-32">
            <p className="landing-index">04 — Arbeitsweise</p>
            <h2 className="landing-ink font-heading mt-5 max-w-[16ch] text-[2rem] font-normal leading-[1.15] tracking-[-0.02em] sm:text-[2.5rem]">
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

        <section className="landing-navy landing-on-dark">
          <div className="landing-wrap grid gap-10 py-24 md:grid-cols-12 md:items-end md:py-32">
            <div className="md:col-span-7">
              <p className="landing-index">05 — Zugang</p>
              <h2 className="landing-ink font-heading mt-5 max-w-[16ch] text-[2rem] font-normal leading-[1.15] tracking-[-0.02em] sm:text-[2.75rem]">
                Recruiter intern. Talente im Portal.
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 md:col-span-5 md:justify-end">
              <Link
                href="/candidate/register"
                className="text-[14px] text-white/80 underline decoration-[#c6a35a]/70 underline-offset-8 transition-colors hover:text-white hover:decoration-[#c6a35a]"
              >
                Als Kandidat registrieren
              </Link>
              <Link href="/login" className="landing-cta">
                Recruiter-Login
              </Link>
            </div>
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
