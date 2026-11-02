import Link from "next/link";
import { ArrowLeft, Mail, Phone, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCompanyById } from "@/lib/queries/companies";
import { Badge } from "@/components/ui/badge";
import { companyStatusLabels, companyInactiveReasonLabels, vacancyStatusLabels } from "@/lib/labels";
import { formatDate } from "@/lib/utils";
import { CompanyStatusControl } from "@/components/kunden/company-status-control";
import { CompanyNoteForm } from "@/components/kunden/company-note-form";

export default async function CompanyDetailPage({ params }: { params: { id: string } }) {
  const company = await getCompanyById(params.id);
  const supabase = createClient();

  const [{ data: vacancies }, { data: activity }] = await Promise.all([
    supabase
      .from("vacancies")
      .select("id, title, status, employment_type, location, created_at")
      .eq("company_id", params.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("activity_logs")
      .select("id, type, content, created_at")
      .eq("entity_type", "company")
      .eq("entity_id", params.id)
      .order("created_at", { ascending: false }),
  ]);

  const statusInfo = companyStatusLabels[company.status as keyof typeof companyStatusLabels];

  return (
    <div className="flex flex-col gap-4">
      <Link href="/kunden" className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Kundenliste
      </Link>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-surface-border bg-white p-5 shadow-panel">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold text-ink">{company.name}</h1>
                <p className="text-sm text-ink-muted">
                  {company.industry ?? "Branche unbekannt"} · {company.city ?? "Ort unbekannt"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                {company.status === "inaktiv" && company.inactive_reason && (
                  <span className="text-xs text-ink-muted">
                    {companyInactiveReasonLabels[company.inactive_reason]}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-surface-border bg-white shadow-panel">
            <div className="border-b border-surface-border px-5 py-3">
              <h2 className="text-sm font-medium text-ink">Vakanzen</h2>
            </div>
            {(!vacancies || vacancies.length === 0) ? (
              <p className="px-5 py-6 text-sm text-ink-muted">Noch keine Vakanzen erfasst.</p>
            ) : (
              <ul className="divide-y divide-surface-border">
                {vacancies.map((v) => {
                  const vStatus = vacancyStatusLabels[v.status as keyof typeof vacancyStatusLabels];
                  return (
                    <li key={v.id} className="flex items-center justify-between px-5 py-3 text-sm">
                      <Link href={`/vakanzen/${v.id}`} className="text-ink hover:text-brand">
                        {v.title}
                      </Link>
                      <Badge variant={vStatus.variant}>{vStatus.label}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-surface-border bg-white shadow-panel">
            <div className="border-b border-surface-border px-5 py-3">
              <h2 className="text-sm font-medium text-ink">Historie & Notizen</h2>
            </div>
            <div className="px-5 py-4">
              <CompanyNoteForm companyId={company.id} />
            </div>
            {(!activity || activity.length === 0) ? (
              <p className="px-5 pb-6 text-sm text-ink-muted">Noch keine Aktivitäten erfasst.</p>
            ) : (
              <ul className="divide-y divide-surface-border">
                {activity.map((a) => (
                  <li key={a.id} className="px-5 py-3 text-sm">
                    <p className="text-ink">{a.content}</p>
                    <p className="text-xs text-ink-muted">{formatDate(a.created_at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-surface-border bg-white p-4 shadow-panel">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
              Status verwalten
            </h3>
            <CompanyStatusControl
              companyId={company.id}
              status={company.status}
              inactiveReason={company.inactive_reason}
            />
          </div>

          <div className="rounded-lg border border-surface-border bg-white p-4 shadow-panel">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
              Zugewiesener KAM
            </h3>
            <p className="text-sm text-ink">{company.assigned_kam?.full_name ?? "Nicht zugewiesen"}</p>
          </div>

          <div className="rounded-lg border border-surface-border bg-white p-4 shadow-panel">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-muted">
              Ansprechpartner
            </h3>
            {(!company.contacts || company.contacts.length === 0) ? (
              <p className="text-sm text-ink-muted">Keine Ansprechpartner hinterlegt.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {company.contacts.map((contact: any) => (
                  <li key={contact.id} className="rounded-md border border-surface-border p-3">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                      {contact.first_name} {contact.last_name}
                      {contact.is_primary && (
                        <Star className="h-3.5 w-3.5 fill-brand text-brand" />
                      )}
                    </p>
                    {contact.position && <p className="text-xs text-ink-muted">{contact.position}</p>}
                    <div className="mt-1.5 flex flex-col gap-1 text-xs text-ink-muted">
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="flex items-center gap-1 hover:text-brand">
                          <Mail className="h-3 w-3" /> {contact.email}
                        </a>
                      )}
                      {contact.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {contact.phone}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
