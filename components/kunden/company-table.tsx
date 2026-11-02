"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Sheet } from "@/components/ui/sheet";
import { companyStatusLabels } from "@/lib/labels";
import { formatDate } from "@/lib/utils";
import { CompanyQuickView } from "@/components/kunden/company-quick-view";
import type { CompanyListItem } from "@/lib/queries/companies";

export function CompanyTable({ companies }: { companies: CompanyListItem[] }) {
  const [selected, setSelected] = useState<CompanyListItem | null>(null);

  if (companies.length === 0) {
    return (
      <div className="px-5 py-16 text-center">
        <p className="text-sm font-medium text-ink">Keine Kunden in dieser Ansicht</p>
        <p className="mt-1 text-sm text-ink-muted">Passe den Tab oder Filter an.</p>
      </div>
    );
  }

  return (
    <>
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-surface-border text-left text-xs text-ink-muted">
              <th className="px-5 py-3 font-medium">Unternehmen</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Offene Vakanzen</th>
              <th className="px-5 py-3 font-medium">KAM</th>
              <th className="px-5 py-3 font-medium">Letzter Kontakt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {companies.map((company) => {
              const statusInfo = companyStatusLabels[company.status];
              return (
                <tr
                  key={company.id}
                  onClick={() => setSelected(company)}
                  className="group cursor-pointer hover:bg-surface-subtle"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-light text-brand">
                        <Building2 className="h-4 w-4" strokeWidth={1.75} />
                      </span>
                      <span>
                        <span className="block font-medium text-ink group-hover:text-brand">
                          {company.name}
                        </span>
                        <span className="block text-xs text-ink-muted">
                          {company.industry ?? "–"} · {company.city ?? "–"}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    {typeof company.months_without_vacancy === "number" && (
                      <span className="ml-2 text-xs text-ink-muted">
                        seit {company.months_without_vacancy} Mon.
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-ink">{company.open_vacancies_count}</td>
                  <td className="px-5 py-3 text-ink-muted">
                    {company.assigned_kam?.full_name ?? "–"}
                  </td>
                  <td className="px-5 py-3 text-ink-muted">{formatDate(company.last_contact_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        {selected && <CompanyQuickView company={selected} />}
      </Sheet>
    </>
  );
}
