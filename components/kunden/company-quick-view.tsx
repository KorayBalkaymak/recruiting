import Link from "next/link";
import { Building2, ExternalLink, Mail, Phone, Star } from "lucide-react";
import { SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { companyStatusLabels, companyInactiveReasonLabels } from "@/lib/labels";
import { formatDate } from "@/lib/utils";
import { CompanyStatusControl } from "@/components/kunden/company-status-control";
import { CompanyNoteForm } from "@/components/kunden/company-note-form";
import type { CompanyListItem } from "@/lib/queries/companies";

export function CompanyQuickView({ company }: { company: CompanyListItem }) {
  const statusInfo = companyStatusLabels[company.status];

  return (
    <SheetContent>
      <SheetHeader>
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-brand-light text-brand">
            <Building2 className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <SheetTitle>{company.name}</SheetTitle>
            <p className="truncate text-sm text-ink-muted">
              {company.industry ?? "Branche unbekannt"} · {company.city ?? "Ort unbekannt"}
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              {company.status === "inaktiv" && company.inactive_reason && (
                <span className="text-xs text-ink-muted">
                  {companyInactiveReasonLabels[company.inactive_reason]}
                </span>
              )}
            </div>
          </div>
        </div>
      </SheetHeader>

      <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-4">
        <div className="flex flex-col gap-6">
          <section>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
              Status verwalten
            </h3>
            <CompanyStatusControl
              companyId={company.id}
              status={company.status}
              inactiveReason={company.inactive_reason}
            />
          </section>

          <section>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
              Zugewiesener KAM
            </h3>
            <p className="text-sm text-ink">
              {company.assigned_kam?.full_name ?? "Nicht zugewiesen"}
            </p>
          </section>

          <section>
            <h3 className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-ink-muted">
              Ansprechpartner
            </h3>
            {company.contacts.length === 0 ? (
              <p className="text-sm text-ink-muted">Keine Ansprechpartner hinterlegt.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {company.contacts.map((contact) => (
                  <li key={contact.id} className="rounded-md border border-surface-border p-3">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                      {contact.first_name} {contact.last_name}
                      {contact.is_primary && (
                        <Star className="h-3.5 w-3.5 fill-brand text-brand" aria-label="Hauptansprechpartner" />
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
          </section>

          <section>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
              Historie & Notizen
            </h3>
            <div className="mb-3">
              <CompanyNoteForm companyId={company.id} />
            </div>
            {company.recent_activity.length === 0 ? (
              <p className="text-sm text-ink-muted">Noch keine Aktivitäten erfasst.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {company.recent_activity.map((activity) => (
                  <li key={activity.id} className="text-sm">
                    <p className="text-ink">{activity.content}</p>
                    <p className="text-xs text-ink-muted">{formatDate(activity.created_at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <Link
            href={`/kunden/${company.id}`}
            className="flex items-center justify-center gap-1.5 rounded-md border border-surface-border py-2 text-sm text-ink hover:bg-surface-subtle"
          >
            Vollständiges Kundenprofil öffnen
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </SheetContent>
  );
}
