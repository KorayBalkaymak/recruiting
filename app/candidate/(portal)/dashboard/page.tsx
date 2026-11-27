import Link from "next/link";
import { requireCandidate } from "@/lib/auth";
import {
  getOwnCandidateCertificateMeta,
  getOwnCandidateCvMeta,
} from "@/lib/candidate/cv-upload";
import { getCandidatePortalView } from "@/lib/candidate/portal-service";
import { portalStatusLabels } from "@/lib/candidate/status-labels";
import type { PortalProfileStatus } from "@/lib/candidate/portal-types";

function firstNameOf(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

function nextStep(status: PortalProfileStatus | undefined) {
  switch (status) {
    case "changes_requested":
      return {
        title: "Anpassungen vornehmen",
        text: "Die Prüfung hat Rückmeldungen hinterlegt. Aktualisiere dein Profil und reiche es erneut ein.",
        href: "/candidate/profile",
        cta: "Profil überarbeiten",
      };
    case "submitted":
    case "in_review":
      return {
        title: "Prüfung läuft",
        text: "Dein Profil liegt beim Recruiting-Team. Du kannst den Verlauf jederzeit einsehen.",
        href: "/candidate/status",
        cta: "Prüfstatus öffnen",
      };
    case "approved":
      return {
        title: "Profil freigegeben",
        text: "Dein Profil ist intern freigegeben. Ergänzungen kannst du weiterhin im Profil hinterlegen.",
        href: "/candidate/profile",
        cta: "Profil ansehen",
      };
    case "rejected":
      return {
        title: "Entscheidung einsehen",
        text: "Dieses Profil wurde nicht freigegeben. Details findest du im Prüfstatus.",
        href: "/candidate/status",
        cta: "Begründung ansehen",
      };
    default:
      return {
        title: "Profil vervollständigen",
        text: "Hinterlege Lebenslauf, Qualifikationen, Rolle und Kompetenzen — danach kannst du zur Prüfung einreichen.",
        href: "/candidate/profile",
        cta: "Profil bearbeiten",
      };
  }
}

function statusChip(status: PortalProfileStatus | undefined) {
  if (status === "approved") return "bg-[#1B7A52] text-white";
  if (status === "rejected") return "bg-[#9B2C2C] text-white";
  if (status === "changes_requested") return "bg-[#8B96D9] text-[#080A12]";
  if (status === "submitted" || status === "in_review") return "bg-[#8B96D9] text-[#080A12]";
  return "bg-white/10 text-white";
}

export default async function CandidateDashboardPage() {
  const candidate = await requireCandidate();
  const [profile, cv, certificate] = await Promise.all([
    getCandidatePortalView(candidate),
    getOwnCandidateCvMeta(candidate).catch(() => null),
    getOwnCandidateCertificateMeta(candidate).catch(() => null),
  ]);
  const status = profile?.status;
  const step = nextStep(status);
  const greetingName = profile?.firstName || firstNameOf(candidate.fullName);

  const checks = [
    { label: "Gewünschte Rolle", done: Boolean(profile?.desiredRole?.trim()) },
    { label: "Kurzprofil", done: Boolean(profile?.summary?.trim()) },
    { label: "Standort", done: Boolean(profile?.city?.trim()) },
    { label: "Stundensatz", done: Boolean(profile?.hourlyRateNet && profile.hourlyRateNet > 0) },
    { label: "Verfügbar ab", done: Boolean(profile?.availabilityDate) },
    { label: "Kompetenzen", done: (profile?.skills.length ?? 0) > 0 },
    { label: "Lebenslauf", done: Boolean(cv?.fileName) },
    { label: "Qualifikationen", done: Boolean(certificate?.fileName) },
    {
      label: "Zur Prüfung eingereicht",
      done: Boolean(status && status !== "draft"),
    },
  ];
  const doneCount = checks.filter((item) => item.done).length;
  const percent = Math.round((doneCount / checks.length) * 100);
  const place = [profile?.city, profile?.country].filter(Boolean).join(", ");

  return (
    <div className="flex flex-col gap-6">
      <section className="relative overflow-hidden rounded-[1.25rem] bg-[#080A12] px-6 py-8 text-white sm:px-9 sm:py-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#141C6B] blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 right-8 h-48 w-72 rounded-full bg-[#1C2A8A]/50 blur-3xl"
        />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[34rem]">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#8B96D9]">
                Übersicht
              </p>
              <span
                className={`rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${statusChip(status)}`}
              >
                {profile ? portalStatusLabels[profile.status] : "Status unbekannt"}
              </span>
            </div>
            <h1 className="mt-5 text-[clamp(2rem,4.4vw,3.15rem)] font-normal leading-[1.05] tracking-[-0.04em]">
              Guten Tag, {greetingName}.
            </h1>
            {profile?.desiredRole ? (
              <p className="mt-4 max-w-[40ch] text-[15px] leading-7 text-white/65">
                {profile.desiredRole}
                {place ? ` · ${place}` : ""}
              </p>
            ) : null}
            {profile?.reviewNote ? (
              <p className="mt-5 max-w-[48ch] border-l-2 border-[#8B96D9] pl-4 text-sm leading-6 text-white/80">
                {profile.reviewNote}
              </p>
            ) : null}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={step.href}
                className="inline-flex min-h-11 items-center bg-[#8B96D9] px-5 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#080A12] transition-colors hover:bg-white"
              >
                {step.cta}
              </Link>
              <Link
                href="/candidate/profile#lebenslauf"
                className="inline-flex min-h-11 items-center px-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/70 transition-colors hover:text-white"
              >
                Lebenslauf
              </Link>
            </div>
          </div>

          <div className="w-full max-w-[16rem] rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#8B96D9]">
              Vollständigkeit
            </p>
            <p className="mt-3 text-[2.75rem] font-normal leading-none tracking-tight">{percent}%</p>
            <p className="mt-2 text-sm text-white/55">
              {doneCount} von {checks.length} Punkten
            </p>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#8B96D9]"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[1.25rem] border border-[#E6E8F0] bg-white px-6 py-7 sm:px-8">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#141C6B]">
            Nächster Schritt
          </p>
          <h2 className="mt-3 text-[1.7rem] font-normal tracking-tight text-ink">{step.title}</h2>
          <p className="mt-3 max-w-[44ch] text-[15px] leading-7 text-ink-muted">{step.text}</p>
        </div>

        <div className="rounded-[1.25rem] border border-[#E6E8F0] bg-white px-6 py-6 sm:px-7">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-muted">
            Checkliste
          </p>
          <ul className="mt-4 divide-y divide-[#E6E8F0]">
            {checks.map((item) => (
              <li key={item.label} className="flex items-center justify-between gap-4 py-3 text-sm">
                <span className="text-ink">{item.label}</span>
                <span
                  className={
                    item.done
                      ? "text-[11px] font-medium uppercase tracking-[0.12em] text-[#0F7A4A]"
                      : "text-[11px] font-medium uppercase tracking-[0.12em] text-ink-muted"
                  }
                >
                  {item.done ? "Erledigt" : "Offen"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/candidate/profile#lebenslauf"
          className="group rounded-[1.25rem] border border-[#E6E8F0] bg-white px-6 py-7 transition-colors hover:border-[#141C6B]/30 hover:bg-[#F4F5FB] sm:px-8"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#141C6B]">01</p>
          <p className="mt-3 text-xl tracking-tight text-ink">Unterlagen & Profil</p>
          <p className="mt-2 max-w-[36ch] text-sm leading-6 text-ink-muted">
            Lebenslauf und Qualifikationen hochladen sowie Angaben aktuell halten.
          </p>
          <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#141C6B]">
            Öffnen
          </p>
        </Link>
        <Link
          href="/candidate/status"
          className="group rounded-[1.25rem] border border-[#E6E8F0] bg-[#141C6B] px-6 py-7 text-white transition-colors hover:bg-[#0B1038] sm:px-8"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#8B96D9]">02</p>
          <p className="mt-3 text-xl tracking-tight">Prüfung</p>
          <p className="mt-2 max-w-[36ch] text-sm leading-6 text-white/70">
            Verlauf und Rückmeldungen des Recruiting-Teams einsehen.
          </p>
          <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#8B96D9]">
            Öffnen
          </p>
        </Link>
      </section>
    </div>
  );
}
