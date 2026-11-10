import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db";
import { candidates, companies, vacancies, vacancySubmissions } from "@/lib/db/schema";
import { num, toIsoRequired } from "@/lib/db/crm";
import { isDemoMode } from "@/lib/demo/mode";
import { Badge } from "@/components/ui/badge";
import { submissionStatusLabels } from "@/lib/labels";
import { formatCurrency, formatDate, initials } from "@/lib/utils";

const statusFilters = [
  { value: "alle", label: "Alle" },
  { value: "vorgeschlagen", label: "Vorgeschlagen" },
  { value: "angefragt", label: "Angefragt" },
  { value: "in_pruefung", label: "In Prüfung" },
  { value: "vorstellungsgespraech", label: "Vorstellungsgespräch" },
  { value: "besetzt", label: "Besetzt" },
  { value: "abgelehnt", label: "Abgelehnt" },
] as const;

async function getSubmissions(status: string) {
  if (isDemoMode()) {
    const supabase = createClient();
    let query = supabase
      .from("vacancy_submissions")
      .select(
        `id, match_score, status, submitted_at, created_at,
       candidate:candidates(id, first_name, last_name, anonymized_title, hourly_rate_net),
       vacancy:vacancies(id, title, company:companies(id, name))`
      )
      .order("created_at", { ascending: false });
    if (status !== "alle") {
      query = query.eq("status", status);
    }
    const { data } = await query;
    return data ?? [];
  }

  const db = getDb();
  const rows = await db
    .select({
      submission: vacancySubmissions,
      candidate: candidates,
      vacancyId: vacancies.id,
      vacancyTitle: vacancies.title,
      companyId: companies.id,
      companyName: companies.name,
    })
    .from(vacancySubmissions)
    .innerJoin(candidates, eq(candidates.id, vacancySubmissions.candidateId))
    .innerJoin(vacancies, eq(vacancies.id, vacancySubmissions.vacancyId))
    .leftJoin(companies, eq(companies.id, vacancies.companyId))
    .orderBy(desc(vacancySubmissions.createdAt));

  const mapped = rows.map((r) => ({
    id: r.submission.id,
    match_score: num(r.submission.matchScore),
    status: r.submission.status,
    submitted_at: r.submission.submittedAt ? toIsoRequired(r.submission.submittedAt) : null,
    created_at: toIsoRequired(r.submission.createdAt),
    candidate: {
      id: r.candidate.id,
      first_name: r.candidate.firstName,
      last_name: r.candidate.lastName,
      anonymized_title: r.candidate.anonymizedTitle,
      hourly_rate_net: num(r.candidate.hourlyRateNet),
    },
    vacancy: {
      id: r.vacancyId,
      title: r.vacancyTitle,
      company: r.companyId ? { id: r.companyId, name: r.companyName } : null,
    },
  }));

  if (status === "alle") return mapped;
  return mapped.filter((s) => s.status === status);
}

export default async function EinreichungenPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const status = searchParams.status ?? "alle";
  const submissions = await getSubmissions(status);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-ink">Einreichungen</h1>
        <p className="text-sm text-ink-muted">
          Alle Kandidaten-Einreichungen über alle Vakanzen hinweg im Überblick.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {statusFilters.map((f) => (
          <Link
            key={f.value}
            href={f.value === "alle" ? "/einreichungen" : `/einreichungen?status=${f.value}`}
            className={
              status === f.value
                ? "rounded-full bg-brand px-3 py-1.5 text-xs font-medium text-white"
                : "rounded-full border border-surface-border px-3 py-1.5 text-xs text-ink-muted hover:border-brand hover:text-brand"
            }
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="rounded-lg border border-surface-border bg-white shadow-panel">
        {submissions.length === 0 ? (
          <p className="px-5 py-16 text-center text-sm text-ink-muted">
            Keine Einreichungen in dieser Ansicht.
          </p>
        ) : (
          <ul className="divide-y divide-surface-border">
            {submissions.map((s: any) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-light text-xs font-semibold text-brand">
                    {initials(s.candidate?.first_name, s.candidate?.last_name)}
                  </span>
                  <div>
                    <Link href={`/kandidaten/${s.candidate?.id}`} className="font-medium text-ink hover:text-brand">
                      {s.candidate?.first_name} {s.candidate?.last_name}
                    </Link>
                    <p className="text-xs text-ink-muted">
                      →{" "}
                      <Link href={`/vakanzen/${s.vacancy?.id}`} className="hover:text-brand">
                        {s.vacancy?.title}
                      </Link>{" "}
                      · {s.vacancy?.company?.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {s.candidate?.hourly_rate_net && (
                    <span className="text-xs text-ink-muted">
                      {formatCurrency(s.candidate.hourly_rate_net)}/Std.
                    </span>
                  )}
                  {s.match_score != null && <Badge variant="brand">{s.match_score}% Match</Badge>}
                  <Badge variant="neutral">{submissionStatusLabels[s.status] ?? s.status}</Badge>
                  <span className="w-16 shrink-0 text-right text-xs text-ink-muted">
                    {formatDate(s.created_at)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
