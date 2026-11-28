import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { getCandidateById } from "@/lib/queries/candidates";
import { ProfileEditor } from "@/components/kandidaten/profile-editor";
import { PortalSubmissionPanel } from "@/components/kandidaten/portal-submission-panel";
import { CandidateStatusSelect } from "@/components/kandidaten/status-select";
import { CandidateClaimActions } from "@/components/kandidaten/claim-actions";
import { LiveRefresh } from "@/components/kandidaten/live-refresh";
import { Badge } from "@/components/ui/badge";
import { submissionStatusLabels } from "@/lib/labels";
import { recruiterInactivity } from "@/lib/candidate/recruiter-workflow";
import { requireCrmStaff } from "@/lib/auth/crm-access";
import { canManageUsers } from "@/lib/auth/roles";
import { getPortalProfileForStaff } from "@/lib/candidate/portal-service";
import { getStaffOriginalDocumentMeta } from "@/lib/candidate/cv-upload";
import { formatCurrency, formatDateTime, initials } from "@/lib/utils";

export default async function CandidateDetailPage({ params }: { params: { id: string } }) {
  const staff = await requireCrmStaff();
  const candidate = await getCandidateById(params.id);
  const [portal, cvMeta, certificateMeta] = await Promise.all([
    getPortalProfileForStaff(staff, params.id),
    getStaffOriginalDocumentMeta(staff, params.id, "cv").catch(() => null),
    getStaffOriginalDocumentMeta(staff, params.id, "certificate").catch(() => null),
  ]);
  const inactivity = recruiterInactivity(candidate.last_recruiter_action_at);
  const claimedBy = candidate.claimed_by ?? null;

  return (
    <div className="flex flex-col gap-4">
      <LiveRefresh />
      <Link
        href="/kandidaten"
        className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Kandidatenliste
      </Link>

      <div className="crm-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-light text-sm font-semibold text-brand">
            {initials(candidate.first_name, candidate.last_name)}
          </span>
          <div>
            <p className="flex items-center gap-2 text-base font-semibold text-ink">
              {candidate.first_name} {candidate.last_name}
              <span className="rounded-sm bg-surface-subtle px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                Nur intern sichtbar
              </span>
            </p>
            <p className="text-sm text-ink-muted">
              {candidate.location ?? "Standort unbekannt"} ·{" "}
              {candidate.hourly_rate_net ? formatCurrency(candidate.hourly_rate_net) + " / Std." : "Stundensatz offen"}
            </p>
            {inactivity.stale ? (
              <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-brand">
                <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />
                {inactivity.label}
                <span className="font-normal text-ink-muted">
                  · letzte Bearbeitung {formatDateTime(candidate.last_recruiter_action_at)}
                </span>
              </p>
            ) : (
              <p className="mt-1 text-xs text-ink-muted">
                Letzte Recruiter-Bearbeitung {formatDateTime(candidate.last_recruiter_action_at)}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:items-end">
          <CandidateStatusSelect candidateId={candidate.id} status={candidate.status} />
          <CandidateClaimActions
            candidateId={candidate.id}
            currentUserId={staff.id}
            canForceRelease={canManageUsers(staff.role)}
            claimedBy={claimedBy}
          />
        </div>
      </div>

      <PortalSubmissionPanel
        profile={portal}
        cvFileName={cvMeta?.fileName ?? null}
        cvMimeType={cvMeta?.mimeType ?? null}
        certificateFileName={certificateMeta?.fileName ?? null}
        certificateMimeType={certificateMeta?.mimeType ?? null}
      />

      <ProfileEditor
        candidateId={candidate.id}
        initialTitle={candidate.anonymized_title}
        initialProfile={candidate.anonymized_profile}
      />

      <div className="crm-panel">
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
