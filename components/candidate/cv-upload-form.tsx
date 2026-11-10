"use client";

import { useState, useTransition } from "react";

export function CandidateCvUploadForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="rounded-lg border border-dashed border-surface-border bg-surface-subtle p-4">
      <h2 className="text-sm font-semibold text-ink">Lebenslauf (privat)</h2>
      <p className="mt-1 text-xs text-ink-muted">
        PDF oder Word, max. 8 MB. Nur du und interne Recruiter können die Datei abrufen.
      </p>
      <form
        className="mt-3 flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const data = new FormData(form);
          startTransition(async () => {
            setError(null);
            setMessage(null);
            const res = await fetch("/api/candidate/cv", { method: "POST", body: data });
            const json = (await res.json().catch(() => ({}))) as { error?: string };
            if (!res.ok) {
              setError(json.error ?? "Upload fehlgeschlagen.");
              return;
            }
            setMessage("Lebenslauf gespeichert.");
            form.reset();
          });
        }}
      >
        <input
          type="file"
          name="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          required
          className="text-sm"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
        >
          {isPending ? "Lädt…" : "Hochladen"}
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      {message && <p className="mt-2 text-xs text-status-done">{message}</p>}
    </div>
  );
}
