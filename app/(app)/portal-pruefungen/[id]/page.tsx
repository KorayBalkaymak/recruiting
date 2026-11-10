import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getPortalProfileForStaff } from "@/lib/candidate/portal-service";
import { portalStatusLabels } from "@/lib/candidate/status-labels";
import { PortalReviewActions } from "@/components/portal-pruefungen/review-actions";
import { Badge } from "@/components/ui/badge";

export default async function PortalPruefungDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const staff = await requireStaff();
  const profile = await getPortalProfileForStaff(staff, params.id);
  if (!profile) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link href="/portal-pruefungen" className="text-xs text-brand hover:underline">
            ← Zurück zur Liste
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-ink">
            {profile.firstName} {profile.lastName}
          </h1>
          <p className="text-sm text-ink-muted">{profile.email}</p>
        </div>
        <Badge variant="neutral">{portalStatusLabels[profile.status]}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-surface-border bg-white p-5 shadow-panel">
          <h2 className="mb-3 text-sm font-semibold text-ink">Profil</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Tätigkeit" value={profile.desiredRole} />
            <Row label="Standort" value={[profile.city, profile.postalCode].filter(Boolean).join(", ")} />
            <Row label="Radius" value={profile.searchRadiusKm != null ? `${profile.searchRadiusKm} km` : null} />
            <Row label="Erfahrung" value={profile.yearsExperience != null ? `${profile.yearsExperience} Jahre` : null} />
            <Row label="Skills" value={profile.skills.join(", ")} />
            <Row label="Keywords" value={profile.keywords.join(", ")} />
            <Row label="Qualifikationen" value={profile.qualifications.join(", ")} />
            <Row label="Zusammenfassung" value={profile.summary} />
          </dl>
          <div className="mt-4 border-t border-surface-border pt-4">
            <a
              href={`/api/portal-pruefungen/${profile.candidateId}/cv`}
              className="text-sm font-medium text-brand hover:underline"
              data-testid="staff-cv-download"
            >
              Lebenslauf herunterladen
            </a>
            <p className="mt-1 text-xs text-ink-muted">
              Autorisierter Staff-Download (404, falls noch kein CV hochgeladen wurde).
            </p>
          </div>
        </div>

        <PortalReviewActions candidateId={profile.candidateId} status={profile.status} />
      </div>

      <div className="rounded-lg border border-surface-border bg-white shadow-panel">
        <div className="border-b border-surface-border px-5 py-3">
          <h2 className="text-sm font-semibold text-ink">Review-Historie</h2>
        </div>
        <ul className="divide-y divide-surface-border">
          {profile.events.length === 0 && (
            <li className="px-5 py-4 text-sm text-ink-muted">Keine Ereignisse.</li>
          )}
          {profile.events.map((event) => (
            <li key={event.id} className="px-5 py-4 text-sm">
              <p className="font-medium text-ink">
                {event.fromStatus ? portalStatusLabels[event.fromStatus] : "—"} →{" "}
                {portalStatusLabels[event.toStatus]}
              </p>
              {event.note && <p className="mt-1 text-ink-muted">{event.note}</p>}
              <p className="mt-1 text-xs text-ink-muted">
                {new Date(event.createdAt).toLocaleString("de-DE")}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="text-ink">{value?.trim() ? value : "—"}</dd>
    </div>
  );
}
