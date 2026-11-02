"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { createContractFromVacancy } from "@/app/(app)/vertraege/actions";

export function FillableVacancies({ vacancies }: { vacancies: any[] }) {
  const [isPending, startTransition] = useTransition();

  if (vacancies.length === 0) return null;

  return (
    <div className="rounded-lg border border-surface-border bg-white shadow-panel">
      <div className="border-b border-surface-border px-5 py-3">
        <h2 className="text-sm font-medium text-ink">Besetzte Vakanzen ohne Vertrag</h2>
      </div>
      <ul className="divide-y divide-surface-border">
        {vacancies.map((v) => (
          <li key={v.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
            <div>
              <p className="font-medium text-ink">{v.title}</p>
              <p className="text-xs text-ink-muted">
                {v.company?.name} ·{" "}
                {v.filled_candidate ? `${v.filled_candidate.first_name} ${v.filled_candidate.last_name}` : "–"} · Start{" "}
                {formatDate(v.filled_start_date)} · {formatCurrency(v.filled_fee, v.currency)}
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              disabled={isPending}
              onClick={() => startTransition(() => createContractFromVacancy(v.id))}
            >
              Vertrag anlegen
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
