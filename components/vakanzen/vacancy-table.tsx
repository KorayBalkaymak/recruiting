import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { employmentTypeLabels } from "@/lib/labels";
import { formatCurrency, formatDate } from "@/lib/utils";

const sourceLabels: Record<string, string> = {
  portal: "Portal",
  email: "E-Mail",
  telefon: "Telefon",
  sonstige: "Sonstige",
};

const closeReasonLabels: Record<string, string> = {
  kunde_storniert: "Kunde storniert",
  position_intern_besetzt: "Position intern besetzt",
  budget_gestrichen: "Budget gestrichen",
  kein_geeigneter_kandidat: "Kein geeigneter Kandidat",
  sonstiges: "Sonstiges",
};

export function VacancyTable({ tab, vacancies }: { tab: string; vacancies: any[] }) {
  if (vacancies.length === 0) {
    return (
      <div className="px-5 py-16 text-center">
        <p className="text-sm font-medium text-ink">Keine Vakanzen in dieser Ansicht</p>
        <p className="mt-1 text-sm text-ink-muted">Neue Einträge erscheinen hier automatisch.</p>
      </div>
    );
  }

  return (
    <div className="scrollbar-thin overflow-x-auto">
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          <tr className="border-b border-surface-border text-left text-xs text-ink-muted">
            <th className="px-5 py-3 font-medium">Vakanz</th>
            <th className="px-5 py-3 font-medium">Kunde</th>
            {tab === "neue_anfrage" && <th className="px-5 py-3 font-medium">Quelle</th>}
            {tab === "in_bearbeitung" && <th className="px-5 py-3 font-medium">Einreichungen</th>}
            {tab === "besetzt" && (
              <>
                <th className="px-5 py-3 font-medium">Besetzt mit</th>
                <th className="px-5 py-3 font-medium">Startdatum</th>
                <th className="px-5 py-3 font-medium">Honorar</th>
              </>
            )}
            {tab === "geschlossen" && <th className="px-5 py-3 font-medium">Grund</th>}
            <th className="px-5 py-3 font-medium">Recruiter</th>
            <th className="px-5 py-3 font-medium">Aktualisiert</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {vacancies.map((v) => (
            <tr key={v.id} className="group hover:bg-surface-subtle">
              <td className="px-5 py-3">
                <Link href={`/vakanzen/${v.id}`} className="font-medium text-ink group-hover:text-brand">
                  {v.title}
                </Link>
                <p className="text-xs text-ink-muted">{employmentTypeLabels[v.employment_type]}</p>
              </td>
              <td className="px-5 py-3 text-ink">{v.company?.name ?? "–"}</td>
              {tab === "neue_anfrage" && (
                <td className="px-5 py-3">
                  <Badge variant="neutral">{sourceLabels[v.source] ?? v.source}</Badge>
                </td>
              )}
              {tab === "in_bearbeitung" && (
                <td className="px-5 py-3 text-ink">{v.submissions?.length ?? 0}</td>
              )}
              {tab === "besetzt" && (
                <>
                  <td className="px-5 py-3 text-ink">
                    {v.filled_candidate
                      ? `${v.filled_candidate.first_name} ${v.filled_candidate.last_name}`
                      : "–"}
                  </td>
                  <td className="px-5 py-3 text-ink">{formatDate(v.filled_start_date)}</td>
                  <td className="px-5 py-3 text-ink">{formatCurrency(v.filled_fee, v.currency)}</td>
                </>
              )}
              {tab === "geschlossen" && (
                <td className="px-5 py-3 text-ink-muted">
                  {closeReasonLabels[v.close_reason] ?? "–"}
                </td>
              )}
              <td className="px-5 py-3 text-ink-muted">{v.assigned_recruiter?.full_name ?? "–"}</td>
              <td className="px-5 py-3 text-ink-muted">{formatDate(v.updated_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
