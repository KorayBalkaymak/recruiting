import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
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

export default async function EinreichungenPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const status = searchParams.status ?? "alle";
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

  const { data: submissions } = await query;

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
        {(!submissions || submissions.length === 0) ? (
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
