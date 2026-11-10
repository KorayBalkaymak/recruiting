import { requireCandidate } from "@/lib/auth";
import {
  getCandidatePortalView,
  getCandidateReviewEvents,
} from "@/lib/candidate/portal-service";
import { portalStatusLabels } from "@/lib/candidate/status-labels";

export default async function CandidateStatusPage() {
  const candidate = await requireCandidate();
  const profile = await getCandidatePortalView(candidate);
  const events = await getCandidateReviewEvents(
    { type: "candidate", user: candidate },
    candidate.candidateId
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Prüfstatus</h1>
        <p className="text-sm text-ink-muted">Aktueller Stand und Historie deiner Einreichung.</p>
      </div>

      <div className="rounded-lg border border-surface-border bg-white p-5 shadow-panel">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Aktuell</p>
        <p className="mt-1 text-lg font-semibold text-ink">
          {profile ? portalStatusLabels[profile.status] : "Unbekannt"}
        </p>
        {profile?.reviewNote && (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-ink">
            {profile.reviewNote}
          </p>
        )}
      </div>

      <div className="rounded-lg border border-surface-border bg-white shadow-panel">
        <div className="border-b border-surface-border px-5 py-3">
          <h2 className="text-sm font-semibold text-ink">Verlauf</h2>
        </div>
        <ul className="divide-y divide-surface-border">
          {events.length === 0 && (
            <li className="px-5 py-4 text-sm text-ink-muted">Noch keine Ereignisse.</li>
          )}
          {events.map((event) => (
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
