"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

type UploadKind = "cv" | "certificate";

const specs: Record<
  UploadKind,
  {
    id: string;
    kicker: string;
    title: string;
    hint: string;
    empty: string;
    saved: string;
    replace: string;
    upload: string;
    endpoint: string;
    inputId: string;
  }
> = {
  cv: {
    id: "lebenslauf",
    kicker: "Pflichtfeld",
    title: "Lebenslauf",
    hint: "PDF oder Word, maximal 8 MB. Die Datei bleibt privat — nur du und das interne Recruiting-Team können sie öffnen.",
    empty: "Noch kein Lebenslauf hinterlegt.",
    saved: "Lebenslauf gespeichert.",
    replace: "Lebenslauf ersetzen",
    upload: "Lebenslauf hochladen",
    endpoint: "/api/candidate/cv",
    inputId: "cv-file",
  },
  certificate: {
    id: "qualifikationen",
    kicker: "Pflichtfeld",
    title: "Qualifikationen",
    hint: "Zeugnisse, Abschlüsse oder Nachweise in einer Datei (PDF oder Word, maximal 8 MB). Ebenfalls nur intern sichtbar.",
    empty: "Noch keine Qualifikationen hinterlegt.",
    saved: "Qualifikationen gespeichert.",
    replace: "Qualifikationen ersetzen",
    upload: "Qualifikationen hochladen",
    endpoint: "/api/candidate/qualifikationen",
    inputId: "certificate-file",
  },
};

export function CandidateDocumentUploadForm({
  kind,
  currentFileName,
}: {
  kind: UploadKind;
  currentFileName?: string | null;
}) {
  const spec = specs[kind];
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [storedName, setStoredName] = useState<string | null>(currentFileName ?? null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [dragging, setDragging] = useState(false);

  function pickFile(file: File | undefined) {
    if (!file || !inputRef.current) return;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    inputRef.current.files = transfer.files;
    setFileName(file.name);
    setError(null);
    setMessage(null);
  }

  return (
    <section
      id={spec.id}
      className="scroll-mt-8 border border-brand/25 bg-white px-5 py-6 sm:px-7 sm:py-7"
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-brand">{spec.kicker}</p>
      <h2 className="mt-2 text-[1.55rem] font-normal tracking-tight text-ink">{spec.title}</h2>
      <p className="mt-2 max-w-[48ch] text-sm leading-6 text-ink-muted">{spec.hint}</p>

      {storedName ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-y border-[#E6E8F0] py-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#0F7A4A]">
              Hinterlegt
            </p>
            <p className="mt-1 text-sm text-ink">{storedName}</p>
          </div>
          <a
            href={spec.endpoint}
            className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink hover:text-brand"
          >
            Herunterladen
          </a>
        </div>
      ) : (
        <p className="mt-5 border-y border-brand/20 py-4 text-sm font-medium text-ink">{spec.empty}</p>
      )}

      <form
        className="mt-5"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const data = new FormData(form);
          startTransition(async () => {
            setError(null);
            setMessage(null);
            const res = await fetch(spec.endpoint, { method: "POST", body: data });
            const json = (await res.json().catch(() => ({}))) as {
              error?: string;
              fileName?: string;
            };
            if (!res.ok) {
              setError(json.error ?? "Upload fehlgeschlagen.");
              return;
            }
            setStoredName(json.fileName ?? fileName);
            setMessage(spec.saved);
            setFileName(null);
            form.reset();
            router.refresh();
          });
        }}
      >
        <label
          htmlFor={spec.inputId}
          className={`flex min-h-[9.5rem] cursor-pointer flex-col items-center justify-center border border-dashed px-6 text-center transition-colors ${
            dragging ? "border-brand bg-brand-light/40" : "border-brand/40 bg-[#F7F8FC]"
          }`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            pickFile(event.dataTransfer.files[0]);
          }}
        >
          <input
            ref={inputRef}
            id={spec.inputId}
            type="file"
            name="file"
            required={!storedName}
            className="sr-only"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(event) => pickFile(event.target.files?.[0])}
          />
          <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-brand">
            Datei wählen oder hierher ziehen
          </span>
          <span className="mt-2 text-sm text-ink-muted">{fileName ?? "PDF, DOC oder DOCX"}</span>
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center bg-brand px-5 text-[12px] font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-brand-hover disabled:opacity-50 sm:w-auto"
        >
          {isPending ? "Wird gespeichert…" : storedName ? spec.replace : spec.upload}
        </button>
      </form>
      {error ? <p className="mt-3 text-sm text-status-danger">{error}</p> : null}
      {message ? <p className="mt-3 text-sm text-[#0F7A4A]">{message}</p> : null}
    </section>
  );
}

export function CandidateCvUploadForm({ currentFileName }: { currentFileName?: string | null }) {
  return <CandidateDocumentUploadForm kind="cv" currentFileName={currentFileName} />;
}
