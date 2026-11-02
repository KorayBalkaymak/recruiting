"use client";

import { useState, useTransition } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { logOfferSent } from "@/app/(app)/rechner/actions";

export function OfferEmailGenerator({
  offerId,
  companyId,
  companyName,
  candidateLabel,
  hourlyRate,
}: {
  offerId: string;
  companyId?: string;
  companyName: string;
  candidateLabel: string;
  hourlyRate: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const emailText = `Sehr geehrte Damen und Herren,

vielen Dank für Ihre Anfrage. Anbei erhalten Sie das anonymisierte Profil sowie unser Angebot für den Einsatz von „${candidateLabel}“ zu einem Verrechnungssatz von ${hourlyRate} pro Stunde (netto).

Die Unterlagen finden Sie im Anhang:
– Anonymisiertes Kandidatenprofil (PDF)
– Angebot / Verrechnungssatzkalkulation (PDF)

Für Rückfragen stehen wir Ihnen jederzeit gerne zur Verfügung.

Mit freundlichen Grüßen
Ihr CMS-Recruiting-Team`;

  function handleCopy() {
    navigator.clipboard.writeText(emailText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleMarkSent() {
    if (!companyId) return;
    startTransition(async () => {
      await logOfferSent(offerId, companyId, emailText);
      setOpen(false);
    });
  }

  return (
    <div className="relative">
      <Button size="sm" variant="secondary" onClick={() => setOpen((o) => !o)}>
        <Mail className="h-3.5 w-3.5" />
        E-Mail erstellen
      </Button>

      {open && (
        <div className="absolute right-0 top-10 z-20 w-96 rounded-lg border border-surface-border bg-white p-4 shadow-xl">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
            Automatisch generierter E-Mail-Text an {companyName || "Kunde"}
          </p>
          <Textarea readOnly rows={10} value={emailText} className="text-xs" />
          <div className="mt-2 flex items-center justify-between">
            <button type="button" onClick={handleCopy} className="text-xs text-brand hover:underline">
              {copied ? "Kopiert!" : "Text kopieren"}
            </button>
            <Button size="sm" onClick={handleMarkSent} disabled={isPending || !companyId}>
              {isPending ? "Speichert…" : "Als versendet markieren"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
