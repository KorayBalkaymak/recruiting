"use client";

import { useState, useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { companyStatusLabels, companyInactiveReasonLabels } from "@/lib/labels";
import { updateCompanyStatus } from "@/app/(app)/kunden/actions";
import type { CompanyInactiveReason, CompanyStatus } from "@/types/supabase";

export function CompanyStatusControl({
  companyId,
  status,
  inactiveReason,
}: {
  companyId: string;
  status: CompanyStatus;
  inactiveReason: string | null;
}) {
  const [pendingStatus, setPendingStatus] = useState<CompanyStatus>(status);
  const [reason, setReason] = useState<CompanyInactiveReason | "">(
    (inactiveReason as CompanyInactiveReason) ?? ""
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const needsReason = pendingStatus === "inaktiv";
  const isDirty =
    pendingStatus !== status || (needsReason && reason !== (inactiveReason ?? ""));

  function handleSave() {
    if (needsReason && !reason) {
      setError("Bitte einen Grund auswählen.");
      return;
    }
    setError(null);
    startTransition(async () => {
      await updateCompanyStatus(companyId, pendingStatus, reason || undefined);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Select value={pendingStatus} onValueChange={(v) => setPendingStatus(v as CompanyStatus)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(companyStatusLabels).map(([value, meta]) => (
            <SelectItem key={value} value={value}>
              {meta.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {needsReason && (
        <Select value={reason} onValueChange={(v) => setReason(v as CompanyInactiveReason)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Grund der Inaktivität auswählen…" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(companyInactiveReasonLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {error && <p className="text-xs text-status-danger">{error}</p>}

      {isDirty && (
        <Button size="sm" onClick={handleSave} disabled={isPending}>
          {isPending ? "Speichert…" : "Status speichern"}
        </Button>
      )}
    </div>
  );
}
