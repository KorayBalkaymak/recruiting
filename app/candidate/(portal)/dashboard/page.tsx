import Link from "next/link";
import { requireCandidate } from "@/lib/auth";
import { getCandidatePortalView } from "@/lib/candidate/portal-service";
import { portalStatusLabels } from "@/lib/candidate/status-labels";

export default async function CandidateDashboardPage() {
  const candidate = await requireCandidate();
  const profile = await getCandidatePortalView(candidate);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Willkommen, {candidate.fullName}</h1>
        <p className="text-sm text-ink-muted">
          Verwalte dein Profil und den aktuellen Prüfstatus.
        </p>
      </div>

      <div className="rounded-lg border border-surface-border bg-white p-5 shadow-panel">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Profilstatus</p>
        <p className="mt-1 text-lg font-semibold text-ink">
          {profile ? portalStatusLabels[profile.status] : "Unbekannt"}
        </p>
        {profile?.reviewNote && (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-ink">
            Hinweis der Prüfung: {profile.reviewNote}
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/candidate/profile"
          className="rounded-lg border border-surface-border bg-white p-5 shadow-panel hover:border-brand"
        >
          <p className="font-medium text-ink">Profil bearbeiten</p>
          <p className="mt-1 text-sm text-ink-muted">Angaben, Skills und Standort aktualisieren.</p>
        </Link>
        <Link
          href="/candidate/status"
          className="rounded-lg border border-surface-border bg-white p-5 shadow-panel hover:border-brand"
        >
          <p className="font-medium text-ink">Prüfstatus ansehen</p>
          <p className="mt-1 text-sm text-ink-muted">Verlauf und Rückmeldungen einsehen.</p>
        </Link>
      </div>
    </div>
  );
}
