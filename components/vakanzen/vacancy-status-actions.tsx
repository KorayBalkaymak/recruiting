"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  closeVacancy,
  fillVacancy,
  mergeRequestIntoVacancy,
  publishVacancy,
  startProcessing,
} from "@/app/(app)/vakanzen/actions";

const closeReasons = [
  { value: "kunde_storniert", label: "Kunde storniert" },
  { value: "position_intern_besetzt", label: "Position intern besetzt" },
  { value: "budget_gestrichen", label: "Budget gestrichen" },
  { value: "kein_geeigneter_kandidat", label: "Kein geeigneter Kandidat" },
  { value: "sonstiges", label: "Sonstiges" },
];

export function NewRequestActions({
  vacancyId,
  existingVacancies,
}: {
  vacancyId: string;
  existingVacancies: { id: string; title: string }[];
}) {
  const [targetId, setTargetId] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-surface-border bg-white p-4 shadow-panel">
      <h3 className="text-xs font-medium uppercase tracking-wide text-ink-muted">
        Anfrage zuweisen
      </h3>
      <Button onClick={() => startTransition(() => publishVacancy(vacancyId))} disabled={isPending}>
        Als offene Vakanz veröffentlichen
      </Button>

      {existingVacancies.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-surface-border pt-3">
          <p className="text-xs text-ink-muted">
            …oder dieser bestehenden Vakanz des Kunden zuordnen:
          </p>
          <Select value={targetId} onValueChange={setTargetId}>
            <SelectTrigger>
              <SelectValue placeholder="Bestehende Vakanz wählen…" />
            </SelectTrigger>
            <SelectContent>
              {existingVacancies.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="secondary"
            size="sm"
            disabled={!targetId || isPending}
            onClick={() => startTransition(() => mergeRequestIntoVacancy(vacancyId, targetId))}
          >
            Zuordnen
          </Button>
        </div>
      )}
    </div>
  );
}

export function ProcessingActions({ vacancyId }: { vacancyId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <div className="rounded-lg border border-surface-border bg-white p-4 shadow-panel">
      <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-muted">Aktion</h3>
      <Button onClick={() => startTransition(() => startProcessing(vacancyId))} disabled={isPending}>
        Kandidatensuche starten (In Bearbeitung)
      </Button>
    </div>
  );
}

export function FillOrCloseActions({
  vacancyId,
  candidates,
}: {
  vacancyId: string;
  candidates: { id: string; first_name: string; last_name: string }[];
}) {
  const [mode, setMode] = useState<"none" | "fill" | "close">("none");
  const [candidateId, setCandidateId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [fee, setFee] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="rounded-lg border border-surface-border bg-white p-4 shadow-panel">
      <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-muted">Aktion</h3>

      {mode === "none" && (
        <div className="flex flex-col gap-2">
          <Button onClick={() => setMode("fill")}>Als besetzt markieren</Button>
          <Button variant="secondary" onClick={() => setMode("close")}>
            Vakanz schließen
          </Button>
        </div>
      )}

      {mode === "fill" && (
        <div className="flex flex-col gap-2">
          <Select value={candidateId} onValueChange={setCandidateId}>
            <SelectTrigger>
              <SelectValue placeholder="Kandidat auswählen…" />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.first_name} {c.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input
            type="number"
            placeholder="Honorar"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
          />
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setMode("none")}>
              Abbrechen
            </Button>
            <Button
              size="sm"
              disabled={!candidateId || !startDate || !fee || isPending}
              onClick={() =>
                startTransition(async () => {
                  await fillVacancy(vacancyId, candidateId, startDate, Number(fee));
                  setMode("none");
                })
              }
            >
              Bestätigen
            </Button>
          </div>
        </div>
      )}

      {mode === "close" && (
        <div className="flex flex-col gap-2">
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger>
              <SelectValue placeholder="Grund wählen…" />
            </SelectTrigger>
            <SelectContent>
              {closeReasons.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Notizen (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setMode("none")}>
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={!reason || isPending}
              onClick={() =>
                startTransition(async () => {
                  await closeVacancy(vacancyId, reason as any, notes);
                  setMode("none");
                })
              }
            >
              Schließen
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
