import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCandidateById } from "@/lib/queries/candidates";
import { ProfileEditor } from "@/components/kandidaten/profile-editor";
import { CandidateStatusSelect } from "@/components/kandidaten/status-select";
import { Badge } from "@/components/ui/badge";
import { submissionStatusLabels } from "@/lib/labels";
import { formatCurrency, formatDate, initials } from "@/lib/utils";

export default async function CandidateDetailPage({ params }: { params: { id: string } }) {
  const candidate = await getCandidateById(params.id);

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/kandidaten"
        className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Kandidatenliste
      </Link>

      <div className="flex flex-col gap-4 rounded-lg border border-surface-border bg-white p-5 shadow-panel sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-light text-sm font-semibold text-brand">
            {initials(candidate.first_name, candidate.last_name)}
          </span>
          <div>
            <p className="flex items-center gap-2 text-base font-semibold text-ink">
              {candidate.first_name} {candidate.last_name}
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                Nur intern sichtbar
              </span>
            </p>
            <p className="text-sm text-ink-muted">
              {candidate.location ?? "Standort unbekannt"} ·{" "}
              {candidate.hourly_rate_net ? formatCurrency(candidate.hourly_rate_net) + " / Std." : "Stundensatz offen"}
            </p>
          </div>
        </div>
        <CandidateStatusSelect candidateId={candidate.id} status={candidate.status} />
      </div>

      <ProfileEditor
        candidateId={candidate.id}
        initialTitle={candidate.anonymized_title}
        initialProfile={candidate.anonymized_profile}
      />

      <div className="rounded-lg border border-surface-border bg-white shadow-panel">
        <div className="border-b border-surface-border px-5 py-3">
          <h2 className="text-sm font-medium text-ink">Einreichungen</h2>
        </div>
        {(!candidate.submissions || candidate.submissions.length === 0) ? (
          <p className="px-5 py-6 text-sm text-ink-muted">
            Dieser Kandidat wurde noch auf keine Vakanz eingereicht.
          </p>
        ) : (
          <ul className="divide-y divide-surface-border">
            {candidate.submissions.map((submission: any) => (
              <li key={submission.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <Link href={`/vakanzen/${submission.vacancy?.id}`} className="text-ink hover:text-brand">
                  {submission.vacancy?.title ?? "Unbekannte Vakanz"}
                </Link>
                <div className="flex items-center gap-3">
                  {submission.match_score != null && (
                    <span className="text-xs text-ink-muted">Match: {submission.match_score}%</span>
                  )}
                  <Badge variant="neutral">
                    {submissionStatusLabels[submission.status] ?? submission.status}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
