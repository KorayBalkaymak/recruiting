import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { candidateStatusLabels } from "@/lib/labels";
import {
  claimStatusLabel,
  MISSING_DOCUMENTS_TAB,
  recruiterInactivity,
} from "@/lib/candidate/recruiter-workflow";
import { formatCurrency, formatDate, formatDateTime, initials } from "@/lib/utils";
import type { CandidateListItem } from "@/lib/queries/candidates";

export function CandidateTable({
  candidates,
  tab,
}: {
  candidates: CandidateListItem[];
  tab: string;
}) {
  const missingDocs = tab === MISSING_DOCUMENTS_TAB;

  if (candidates.length === 0) {
    return (
      <div className="px-5 py-16 text-center">
        <p className="text-sm font-medium text-ink">Keine Kandidaten in dieser Ansicht</p>
        <p className="mt-1 text-sm text-ink-muted">
          {missingDocs
            ? "Registrierte Kandidaten ohne hochgeladenen Lebenslauf erscheinen hier."
            : "Neue Kandidaten erscheinen hier, sobald sie angelegt wurden."}
        </p>
      </div>
    );
  }

  return (
    <div className="scrollbar-thin overflow-x-auto">
      <table className="w-full min-w-[960px] text-sm">
        <thead>
          <tr className="border-b border-surface-border text-left text-xs text-ink-muted">
            <th className="px-5 py-3 font-medium">Kandidat</th>
            <th className="px-5 py-3 font-medium">{missingDocs ? "E-Mail" : "Standort"}</th>
            <th className="px-5 py-3 font-medium">Profilstatus</th>
            {missingDocs ? <th className="px-5 py-3 font-medium">Registriert</th> : (
              <>
                <th className="px-5 py-3 font-medium">Stundensatz (netto)</th>
                <th className="px-5 py-3 font-medium">Verfügbar ab</th>
              </>
            )}
            <th className="px-5 py-3 font-medium">Bearbeitung</th>
            <th className="px-5 py-3 font-medium">Letzte Recruiter-Aktion</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {candidates.map((candidate) => {
            const statusInfo = candidateStatusLabels[candidate.status];
            const inactivity = recruiterInactivity(candidate.last_recruiter_action_at);
            return (
              <tr key={candidate.id} className="group hover:bg-surface-subtle">
                <td className="px-5 py-3">
                  <Link href={`/kandidaten/${candidate.id}`} className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-light text-xs font-semibold text-brand">
                      {initials(candidate.first_name, candidate.last_name)}
                    </span>
                    <span>
                      <span className="block font-medium text-ink group-hover:text-brand">
                        {candidate.first_name} {candidate.last_name}
                      </span>
                      <span className="block text-xs text-ink-muted">
                        {candidate.anonymized_title ?? "Kein Titel gesetzt"}
                      </span>
                      {inactivity.stale ? (
                        <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-brand">
                          <AlertTriangle className="h-3 w-3" strokeWidth={2} />
                          {inactivity.label}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </td>
                <td className="px-5 py-3 text-ink">
                  {missingDocs ? candidate.email ?? "–" : candidate.location ?? "–"}
                </td>
                <td className="px-5 py-3">
                  <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                </td>
                {missingDocs ? (
                  <td className="px-5 py-3 text-ink">{formatDate(candidate.created_at)}</td>
                ) : (
                  <>
                    <td className="px-5 py-3 text-ink">
                      {candidate.hourly_rate_net ? formatCurrency(candidate.hourly_rate_net) : "–"}
                    </td>
                    <td className="px-5 py-3 text-ink">{formatDate(candidate.availability_date)}</td>
                  </>
                )}
                <td className="px-5 py-3 text-ink-muted">
                  {candidate.claimed_by ? (
                    <span className="text-ink">{claimStatusLabel(candidate.claimed_by.full_name)}</span>
                  ) : (
                    candidate.assigned_recruiter?.full_name ?? "–"
                  )}
                </td>
                <td className="px-5 py-3 text-ink-muted">
                  {formatDateTime(candidate.last_recruiter_action_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
