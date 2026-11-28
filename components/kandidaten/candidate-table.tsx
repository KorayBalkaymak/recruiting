import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Calendar, MapPin } from "lucide-react";
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
  inverted = false,
}: {
  candidates: CandidateListItem[];
  tab: string;
  inverted?: boolean;
}) {
  const missingDocs = tab === MISSING_DOCUMENTS_TAB;

  if (candidates.length === 0) {
    return (
      <div className="px-6 py-20 text-center">
        <p
          className={
            inverted
              ? "text-[11px] font-medium uppercase tracking-[0.18em] text-white/80"
              : "text-[11px] font-medium uppercase tracking-[0.18em] text-[#141C6B]"
          }
        >
          Pipeline
        </p>
        <p className={inverted ? "mt-2 text-lg font-medium tracking-tight text-white" : "mt-2 text-lg font-medium tracking-tight text-ink"}>
          Keine Kandidaten in dieser Ansicht
        </p>
        <p
          className={
            inverted
              ? "mx-auto mt-2 max-w-[36ch] text-sm leading-6 text-white/75"
              : "mx-auto mt-2 max-w-[36ch] text-sm leading-6 text-ink-muted"
          }
        >
          {missingDocs
            ? "Registrierte Kandidaten ohne hochgeladenen Lebenslauf erscheinen hier."
            : "Neue Profile landen hier, sobald sie angelegt oder aus dem Portal eingereicht werden."}
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-1 p-1.5 sm:p-2">
      {candidates.map((candidate) => {
        const statusInfo = candidateStatusLabels[candidate.status];
        const inactivity = recruiterInactivity(candidate.last_recruiter_action_at);
        return (
          <li key={candidate.id}>
            <Link
              href={`/kandidaten/${candidate.id}`}
              className="group grid grid-cols-1 items-center gap-2 rounded-md border border-[#E6E8F0] bg-white px-2.5 py-1.5 transition-colors hover:border-[#141C6B]/25 hover:bg-[#FAFBFF] sm:grid-cols-[minmax(0,1.4fr)_minmax(0,0.7fr)_auto] lg:grid-cols-[minmax(0,1.5fr)_128px_132px_118px_minmax(0,0.9fr)_24px]"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#141C6B] text-[11px] font-semibold tracking-wide text-white">
                  {initials(candidate.first_name, candidate.last_name)}
                </span>
                <span className="min-w-0">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-medium tracking-tight text-ink">
                      {candidate.first_name} {candidate.last_name}
                    </span>
                    {inactivity.stale ? (
                      <span className="inline-flex shrink-0 items-center gap-0.5 text-[10px] font-medium text-[#E4572E]">
                        <AlertTriangle className="h-3 w-3" strokeWidth={2} />
                        {inactivity.label}
                      </span>
                    ) : null}
                  </span>
                  <span className="block truncate text-[11px] text-ink-muted">
                    {candidate.anonymized_title ?? "Titel folgt im Exposé"}
                  </span>
                </span>
              </span>

              <span className="flex items-center gap-1 text-xs text-ink">
                {missingDocs ? (
                  <span className="truncate text-ink-muted">{candidate.email ?? "Keine E-Mail"}</span>
                ) : (
                  <>
                    <MapPin className="h-3 w-3 shrink-0 text-[#141C6B]" strokeWidth={1.75} />
                    <span className="truncate">{candidate.location ?? "Standort offen"}</span>
                  </>
                )}
              </span>

              <span className="justify-self-start">
                <span className="inline-flex rounded-full bg-[#F4F5FB] px-2 py-0.5 text-[10px] font-medium text-[#141C6B]">
                  {statusInfo.label}
                </span>
              </span>

              {missingDocs ? (
                <span className="text-xs text-ink-muted">{formatDate(candidate.created_at)}</span>
              ) : (
                <>
                  <span className="text-xs font-medium tabular-nums text-ink">
                    {candidate.hourly_rate_net ? `${formatCurrency(candidate.hourly_rate_net)}` : "Satz offen"}
                  </span>
                  <span className="hidden items-center gap-1 text-xs text-ink-muted lg:flex">
                    <Calendar className="h-3 w-3 text-[#141C6B]" strokeWidth={1.75} />
                    {candidate.availability_date ? formatDate(candidate.availability_date) : "Datum offen"}
                  </span>
                </>
              )}

              <span className="hidden min-w-0 lg:block">
                <span className="block truncate text-xs text-ink">
                  {candidate.claimed_by
                    ? claimStatusLabel(candidate.claimed_by.full_name)
                    : candidate.assigned_recruiter?.full_name ?? "Noch unbesetzt"}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-ink-muted">
                  {formatDateTime(candidate.last_recruiter_action_at)}
                </span>
              </span>

              <span className="hidden h-6 w-6 items-center justify-center rounded-full bg-[#F4F5FB] text-[#141C6B] transition-colors group-hover:bg-[#E4572E] group-hover:text-white lg:flex">
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
