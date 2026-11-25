import Link from "next/link";
import { requireCandidate } from "@/lib/auth";
import { getOwnCandidateCvMeta } from "@/lib/candidate/cv-upload";
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
        text: "Hinterlege Rolle, Kurzprofil und Kompetenzen — danach kannst du zur Prüfung einreichen.",
        href: "/candidate/profile",
        cta: "Profil bearbeiten",
      };
  }
}

function statusTone(status: PortalProfileStatus | undefined) {
  if (status === "approved") return "text-[#0F7A4A]";
  if (status === "rejected") return "text-status-danger";
  if (status === "changes_requested") return "text-brand";
  if (status === "submitted" || status === "in_review") return "text-brand";
  return "text-ink";
}

export default async function CandidateDashboardPage() {
  const candidate = await requireCandidate();
  const [profile, cv] = await Promise.all([
    getCandidatePortalView(candidate),
    getOwnCandidateCvMeta(candidate).catch(() => null),
  ]);
  const status = profile?.status;
  const step = nextStep(status);
  const greetingName = profile?.firstName || firstNameOf(candidate.fullName);

  const checks = [
    { label: "Gewünschte Rolle", done: Boolean(profile?.desiredRole?.trim()) },
    { label: "Kurzprofil", done: Boolean(profile?.summary?.trim()) },
    { label: "Standort", done: Boolean(profile?.city?.trim()) },
    { label: "Kompetenzen", done: (profile?.skills.length ?? 0) > 0 },
    { label: "Lebenslauf", done: Boolean(cv?.fileName) },
    {
      label: "Zur Prüfung eingereicht",
      done: Boolean(status && status !== "draft"),
    },
  ];
  const doneCount = checks.filter((item) => item.done).length;
  const place = [profile?.city, profile?.country].filter(Boolean).join(", ");

  return (
    <div className="flex flex-col gap-8">
      <section className="border-b border-[#E6E8F0] pb-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-brand">
          Kandidatenportal
        </p>
        <h1 className="mt-3 max-w-[16ch] text-[clamp(1.85rem,4vw,2.75rem)] font-normal leading-[1.08] tracking-[-0.03em] text-ink">
          Guten Tag, {greetingName}.
        </h1>
        <p className="mt-3 max-w-[42ch] text-[15px] leading-7 text-ink-muted">
          {profile?.desiredRole
            ? `${profile.desiredRole}${place ? ` · ${place}` : ""}`
            : "Verwalte Profil, Unterlagen und den Stand der internen Prüfung."}
        </p>
        <p className={`mt-5 text-[13px] font-medium uppercase tracking-[0.14em] ${statusTone(status)}`}>
          {profile ? portalStatusLabels[profile.status] : "Status unbekannt"}
        </p>
        {profile?.reviewNote ? (
          <p className="mt-4 max-w-[52ch] border-l-2 border-brand pl-4 text-sm leading-6 text-ink">
            {profile.reviewNote}
          </p>
        ) : null}
      </section>

      <section className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-muted">
            Nächster Schritt
          </p>
          <h2 className="mt-3 text-[1.65rem] font-normal tracking-tight text-ink">{step.title}</h2>
          <p className="mt-3 max-w-[44ch] text-[15px] leading-7 text-ink-muted">{step.text}</p>
          <Link
            href={step.href}
            className="mt-6 inline-flex min-h-11 items-center bg-brand px-5 text-[12px] font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-brand-hover"
          >
            {step.cta}
          </Link>
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-muted">
              Vollständigkeit
            </p>
            <p className="text-[13px] text-ink-muted">
              {doneCount} von {checks.length}
            </p>
          </div>
          <ul className="mt-5 divide-y divide-[#E6E8F0] border-y border-[#E6E8F0]">
            {checks.map((item) => (
              <li key={item.label} className="flex items-center justify-between gap-4 py-3.5 text-sm">
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

      <section className="grid gap-px bg-[#E6E8F0] sm:grid-cols-2">
        <Link
          href="/candidate/profile#lebenslauf"
          className="bg-[#F7F8FC] px-0 py-6 transition-colors hover:bg-white sm:pr-8"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-brand">01</p>
          <p className="mt-3 text-lg tracking-tight text-ink">Lebenslauf & Profil</p>
          <p className="mt-2 max-w-[36ch] text-sm leading-6 text-ink-muted">
            Unterlage hochladen sowie Angaben und Kompetenzen aktuell halten.
          </p>
        </Link>
        <Link
          href="/candidate/status"
          className="bg-[#F7F8FC] px-0 py-6 transition-colors hover:bg-white sm:pl-8"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-brand">02</p>
          <p className="mt-3 text-lg tracking-tight text-ink">Prüfung</p>
          <p className="mt-2 max-w-[36ch] text-sm leading-6 text-ink-muted">
            Verlauf und Rückmeldungen des Recruiting-Teams einsehen.
          </p>
        </Link>
      </section>
    </div>
  );
}
