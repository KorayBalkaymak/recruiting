"use client";

import { useState, useTransition } from "react";
import { reviewPortalProfileAction } from "@/app/(app)/portal-pruefungen/actions";
import type { PortalProfileStatus } from "@/lib/candidate/portal-types";
import { Button } from "@/components/ui/button";

export function PortalReviewActions({
  candidateId,
  status,
}: {
  candidateId: string;
  status: PortalProfileStatus;
}) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(toStatus: PortalProfileStatus) {
    startTransition(async () => {
      setError(null);
      try {
        await reviewPortalProfileAction(candidateId, toStatus, note || undefined);
        setNote("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Aktion fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-surface-border bg-white p-5 shadow-panel">
      <h2 className="text-sm font-semibold text-ink">Prüfung</h2>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink">Interne Begründung / Hinweis</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          placeholder="Für Änderungen oder Ablehnung erforderlich"
        />
      </label>
      {error && <p className="text-sm text-status-danger">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {status === "submitted" && (
          <Button disabled={isPending} onClick={() => run("in_review")}>
            Prüfung starten
          </Button>
        )}
        {status === "in_review" && (
          <>
            <Button disabled={isPending} onClick={() => run("approved")}>
              Freigeben
            </Button>
            <Button
              variant="secondary"
              disabled={isPending}
              onClick={() => run("changes_requested")}
            >
              Änderungen anfordern
            </Button>
            <Button
              variant="secondary"
              disabled={isPending}
              className="text-status-danger"
              onClick={() => run("rejected")}
            >
              Ablehnen
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
