import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  getCandidatesForMatching,
  getOpenVacanciesForCompany,
  getVacancyById,
} from "@/lib/queries/vacancies";
import { Badge } from "@/components/ui/badge";
import { employmentTypeLabels, vacancyStatusLabels } from "@/lib/labels";
import { formatCurrency, formatDate } from "@/lib/utils";
import { MatchingPanel } from "@/components/vakanzen/matching-panel";
import {
  FillOrCloseActions,
  NewRequestActions,
  ProcessingActions,
} from "@/components/vakanzen/vacancy-status-actions";

export default async function VacancyDetailPage({ params }: { params: { id: string } }) {
  const vacancy = await getVacancyById(params.id);
  const statusInfo = vacancyStatusLabels[vacancy.status as keyof typeof vacancyStatusLabels];

  const existingCandidateIds = (vacancy.submissions ?? [])
    .map((s: any) => s.candidate?.id)
    .filter(Boolean);

  const [openVacanciesForCompany, availableCandidates] = await Promise.all([
    vacancy.status === "neue_anfrage"
      ? getOpenVacanciesForCompany(vacancy.company_id, vacancy.id)
      : Promise.resolve([]),
    getCandidatesForMatching(existingCandidateIds),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/vakanzen" className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Pipeline
      </Link>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-surface-border bg-white p-5 shadow-panel">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-lg font-semibold text-ink">{vacancy.title}</h1>
                <p className="text-sm text-ink-muted">
                  {vacancy.company?.name} · {vacancy.location ?? "Ort unbekannt"}
                </p>
              </div>
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-surface-border pt-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-ink-muted">Anstellungsart</dt>
                <dd className="text-ink">{employmentTypeLabels[vacancy.employment_type]}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Budget/Gehaltsspanne</dt>
                <dd className="text-ink">
                  {vacancy.budget_min || vacancy.budget_max
                    ? `${formatCurrency(vacancy.budget_min, vacancy.currency)} – ${formatCurrency(
                        vacancy.budget_max,
                        vacancy.currency
                      )}`
                    : "–"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Gewünschter Start</dt>
                <dd className="text-ink">{formatDate(vacancy.start_date)}</dd>
              </div>
            </dl>

            {vacancy.requirements && (
              <div className="mt-4 border-t border-surface-border pt-4">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-muted">
                  Anforderungsprofil
                </p>
                <p className="whitespace-pre-line text-sm text-ink">{vacancy.requirements}</p>
              </div>
            )}

            {vacancy.status === "besetzt" && vacancy.filled_candidate && (
              <div className="mt-4 rounded-md bg-status-done/10 p-3 text-sm text-ink">
                Besetzt mit <strong>{vacancy.filled_candidate.first_name} {vacancy.filled_candidate.last_name}</strong>{" "}
                zum {formatDate(vacancy.filled_start_date)} · Honorar{" "}
                {formatCurrency(vacancy.filled_fee, vacancy.currency)}
              </div>
            )}

            {vacancy.status === "geschlossen" && vacancy.close_reason && (
              <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-ink-muted">
                Geschlossen — Grund: {vacancy.close_reason}
                {vacancy.close_notes ? ` · ${vacancy.close_notes}` : ""}
              </div>
            )}
          </div>

          {(vacancy.status === "offen" || vacancy.status === "in_bearbeitung") && (
            <MatchingPanel
              vacancyId={vacancy.id}
              submissions={vacancy.submissions ?? []}
              availableCandidates={availableCandidates}
            />
          )}
        </div>

        <div className="flex flex-col gap-4">
          {vacancy.status === "neue_anfrage" && (
            <NewRequestActions vacancyId={vacancy.id} existingVacancies={openVacanciesForCompany} />
          )}
          {vacancy.status === "offen" && <ProcessingActions vacancyId={vacancy.id} />}
          {vacancy.status === "in_bearbeitung" && (
            <FillOrCloseActions
              vacancyId={vacancy.id}
              candidates={(vacancy.submissions ?? [])
                .map((s: any) => s.candidate)
                .filter(Boolean)}
            />
          )}

          <div className="rounded-lg border border-surface-border bg-white p-4 shadow-panel">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
              Zuständig
            </h3>
            <p className="text-sm text-ink">{vacancy.assigned_recruiter?.full_name ?? "Nicht zugewiesen"}</p>
          </div>

          {vacancy.contact && (
            <div className="rounded-lg border border-surface-border bg-white p-4 shadow-panel">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
                Ansprechpartner
              </h3>
              <p className="text-sm text-ink">
                {vacancy.contact.first_name} {vacancy.contact.last_name}
              </p>
              {vacancy.contact.email && (
                <a href={`mailto:${vacancy.contact.email}`} className="text-xs text-ink-muted hover:text-brand">
                  {vacancy.contact.email}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
