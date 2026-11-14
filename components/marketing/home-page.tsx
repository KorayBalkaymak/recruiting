import Link from "next/link";
import { ArrowRight, Briefcase, ShieldCheck, Sparkles, Users } from "lucide-react";

const pillars = [
  {
    icon: ShieldCheck,
    title: "Qualität vor Tempo",
    text: "Jedes Profil wird intern geprüft, bevor es zum Kunden geht. Keine Massenware, keine unklaren Lebensläufe.",
  },
  {
    icon: Briefcase,
    title: "Klare Pipeline",
    text: "Vakanzen, Einreichungen und Status in einem Arbeitsbereich — nachvollziehbar für Recruiter, KAM und Geschäftsleitung.",
  },
  {
    icon: Users,
    title: "Ein Portal für Talente",
    text: "Kandidaten pflegen Profil und Unterlagen selbst. Status bleibt transparent, ohne das interne CRM zu öffnen.",
  },
];

const steps = [
  { n: "01", title: "Verstehen", text: "Rolle, Markt und Erwartung des Kunden werden festgehalten — nicht nur ein Jobtitel." },
  { n: "02", title: "Prüfen", text: "Talente reichen über das Portal ein. Unser Team bewertet Passung, Unterlagen und Verfügbarkeit." },
  { n: "03", title: "Platzieren", text: "Nur freigegebene Profile gehen an den Kunden. Jede Einreichung bleibt dokumentiert." },
];

export function HomePage() {
  return (
    <div className="landing-shell landing-mesh min-h-screen">
      <header className="border-b border-white/10">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-xs font-semibold tracking-wide text-white">
              CMS
            </span>
            <span className="text-sm font-medium tracking-[0.18em] text-white/90">TALENTS</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/candidate/login"
              className="rounded-md px-3 py-2 text-sm text-white/70 transition-colors hover:text-white"
            >
              Kandidaten
            </Link>
            <Link
              href="/login"
              className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
            >
              Recruiter
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative mx-auto max-w-6xl px-6 pb-20 pt-16 sm:pb-28 sm:pt-24">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-white/60">
            <Sparkles className="h-3 w-3 text-brand" strokeWidth={2} />
            B2B Recruiting
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-6xl">
            Talente, die zum Geschäft passen.
            <span className="mt-2 block text-white/45">Nicht zur Stellenanzeige.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-white/65 sm:text-lg">
            CMS Talents ist die Arbeitsplattform für internes Recruiting: Kunden, Vakanzen und
            geprüfte Kandidaten in einem System — präzise, ruhig, nachvollziehbar.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <Link
              href="/login"
              className="group rounded-2xl border border-white/10 bg-white/[0.04] p-7 transition-colors hover:border-brand/50 hover:bg-white/[0.07]"
            >
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-brand">Intern</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Recruiter-Bereich</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/55">
                Pipeline, Kunden und Portal-Prüfungen. Zugang nur für das CMS-Team.
              </p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-white">
                Anmelden
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
            <Link
              href="/candidate/login"
              className="group rounded-2xl border border-white/10 bg-white/[0.04] p-7 transition-colors hover:border-white/25 hover:bg-white/[0.07]"
            >
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/40">Portal</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Für Kandidaten</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/55">
                Profil anlegen, Unterlagen hochladen, Status verfolgen — ohne Umwege.
              </p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-white">
                Zum Portal
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </div>
        </section>

        <section className="border-t border-white/10 bg-black/20">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 sm:grid-cols-3 sm:gap-8">
            {pillars.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title}>
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-white/5">
                    <Icon className="h-4 w-4 text-brand" strokeWidth={1.75} />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/55">{item.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/40">Arbeitsweise</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Drei Schritte. Kein Rauschen.
          </h2>
          <ol className="mt-12 grid gap-6 sm:grid-cols-3">
            {steps.map((step) => (
              <li
                key={step.n}
                className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent p-6"
              >
                <span className="font-mono text-xs text-brand">{step.n}</span>
                <h3 className="mt-3 text-xl font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-t border-white/10">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-6 py-16 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-2xl font-semibold text-white">Bereit für den nächsten Schritt?</h2>
              <p className="mt-2 max-w-md text-sm text-white/55">
                Recruiter arbeiten intern. Talente starten im Portal. Beides bleibt getrennt — so bleibt es professionell.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/candidate/register"
                className="rounded-md border border-white/15 px-4 py-2.5 text-sm font-medium text-white/85 hover:border-white/30"
              >
                Als Kandidat registrieren
              </Link>
              <Link
                href="/login"
                className="rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover"
              >
                Recruiter-Login
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between">
          <p>CMS Talents · Internes Recruiting & Kandidatenportal</p>
          <p>Zugriff nur für berechtigte Nutzer.</p>
        </div>
      </footer>
    </div>
  );
}
