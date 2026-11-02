import Link from "next/link";
import { Inbox, Mail, Phone, Globe } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { employmentTypeLabels } from "@/lib/labels";
import { formatDate } from "@/lib/utils";

const sourceIcons: Record<string, typeof Mail> = {
  portal: Globe,
  email: Mail,
  telefon: Phone,
  sonstige: Inbox,
};

const sourceLabels: Record<string, string> = {
  portal: "Portal",
  email: "E-Mail",
  telefon: "Telefon",
  sonstige: "Sonstige",
};

export default async function AnfragenPage() {
  const supabase = createClient();
  const { data: requests } = await supabase
    .from("vacancies")
    .select(
      "id, title, source, employment_type, location, created_at, company:companies(id, name), assigned_recruiter:profiles(id, full_name)"
    )
    .eq("status", "neue_anfrage")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-ink">Anfragen</h1>
        <p className="text-sm text-ink-muted">
          Neu eingegangene Vakanz-Anfragen über Portal, E-Mail und Telefon — bereit zur Zuweisung.
        </p>
      </div>

      <div className="rounded-lg border border-surface-border bg-white shadow-panel">
        {(!requests || requests.length === 0) ? (
          <div className="px-5 py-16 text-center">
            <Inbox className="mx-auto mb-2 h-8 w-8 text-ink-muted" strokeWidth={1.5} />
            <p className="text-sm font-medium text-ink">Posteingang leer</p>
            <p className="mt-1 text-sm text-ink-muted">Neue Anfragen erscheinen hier automatisch.</p>
          </div>
        ) : (
          <ul className="divide-y divide-surface-border">
            {requests.map((r: any) => {
              const Icon = sourceIcons[r.source] ?? Inbox;
              return (
                <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-light text-brand">
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-ink">{r.title}</p>
                      <p className="text-xs text-ink-muted">
                        {r.company?.name ?? "Unbekannter Kunde"} · {sourceLabels[r.source]} ·{" "}
                        {employmentTypeLabels[r.employment_type]} · {r.location ?? "Ort offen"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-ink-muted">{formatDate(r.created_at)}</span>
                    <Link
                      href={`/vakanzen/${r.id}`}
                      className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover"
                    >
                      Prüfen & zuweisen
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
