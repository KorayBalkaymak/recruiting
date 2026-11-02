"use client";

import { useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { updateContractStatus } from "@/app/(app)/vertraege/actions";
import type { ContractStatus } from "@/types/supabase";

const statusLabels: Record<ContractStatus, { label: string; variant: "neutral" | "green" | "amber" | "red" }> = {
  entwurf: { label: "Entwurf", variant: "neutral" },
  aktiv: { label: "Aktiv", variant: "green" },
  beendet: { label: "Beendet", variant: "amber" },
  storniert: { label: "Storniert", variant: "red" },
};

export function ContractTable({ contracts }: { contracts: any[] }) {
  const [isPending, startTransition] = useTransition();

  if (contracts.length === 0) {
    return (
      <p className="px-5 py-16 text-center text-sm text-ink-muted">
        Noch keine Verträge vorhanden. Erstelle einen Vertrag aus einer besetzten Vakanz.
      </p>
    );
  }

  return (
    <div className="scrollbar-thin overflow-x-auto">
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr className="border-b border-surface-border text-left text-xs text-ink-muted">
            <th className="px-5 py-3 font-medium">Vertrag</th>
            <th className="px-5 py-3 font-medium">Kunde</th>
            <th className="px-5 py-3 font-medium">Kandidat</th>
            <th className="px-5 py-3 font-medium">Start</th>
            <th className="px-5 py-3 font-medium">Honorar</th>
            <th className="px-5 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {contracts.map((c) => (
            <tr key={c.id} className="hover:bg-surface-subtle">
              <td className="px-5 py-3 font-medium text-ink">{c.contract_number}</td>
              <td className="px-5 py-3 text-ink">{c.company?.name ?? "–"}</td>
              <td className="px-5 py-3 text-ink">
                {c.candidate ? `${c.candidate.first_name} ${c.candidate.last_name}` : "–"}
              </td>
              <td className="px-5 py-3 text-ink-muted">{formatDate(c.start_date)}</td>
              <td className="px-5 py-3 text-ink">{formatCurrency(c.fee, c.currency)}</td>
              <td className="px-5 py-3">
                <Select
                  value={c.status}
                  onValueChange={(v) =>
                    startTransition(() => updateContractStatus(c.id, v as ContractStatus))
                  }
                  disabled={isPending}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue>
                      <Badge variant={statusLabels[c.status as ContractStatus].variant}>
                        {statusLabels[c.status as ContractStatus].label}
                      </Badge>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([value, meta]) => (
                      <SelectItem key={value} value={value}>
                        {meta.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
