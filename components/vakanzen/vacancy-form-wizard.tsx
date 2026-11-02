"use client";

import { useMemo, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { employmentTypeLabels } from "@/lib/labels";
import { cn, formatCurrency } from "@/lib/utils";
import { createVacancy } from "@/app/(app)/vakanzen/actions";

type Company = {
  id: string;
  name: string;
  contacts: { id: string; first_name: string; last_name: string }[];
};

const steps = ["Grunddaten", "Anforderungen", "Zusätzliche Infos", "Vorschau & Speichern"];

const sourceOptions = [
  { value: "portal", label: "Portal" },
  { value: "email", label: "E-Mail" },
  { value: "telefon", label: "Telefon" },
  { value: "sonstige", label: "Sonstige" },
];

export function VacancyFormWizard({ companies }: { companies: Company[] }) {
  const [step, setStep] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [companyId, setCompanyId] = useState("");
  const [contactId, setContactId] = useState("");
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("portal");
  const [employmentType, setEmploymentType] = useState("festanstellung");

  const [requirements, setRequirements] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [location, setLocation] = useState("");

  const [startDate, setStartDate] = useState("");

  const selectedCompany = companies.find((c) => c.id === companyId);
  const contactsForCompany = useMemo(() => selectedCompany?.contacts ?? [], [selectedCompany]);

  function canProceed() {
    if (step === 0) return !!companyId && !!title;
    return true;
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        await createVacancy({
          companyId,
          contactId: contactId || undefined,
          title,
          source: source as any,
          employmentType: employmentType as any,
          requirements: requirements || undefined,
          budgetMin: budgetMin ? Number(budgetMin) : undefined,
          budgetMax: budgetMax ? Number(budgetMax) : undefined,
          currency,
          location: location || undefined,
          startDate: startDate || undefined,
        });
      } catch (e) {
        // redirect() wirft intern einen speziellen Fehler — das ist erwartetes Verhalten
        if (e instanceof Error && e.message !== "NEXT_REDIRECT") {
          setError(e.message);
        }
      }
    });
  }

  return (
    <div className="rounded-lg border border-surface-border bg-white p-6 shadow-panel">
      <ol className="mb-6 flex items-center gap-2">
        {steps.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                i < step
                  ? "bg-brand text-white"
                  : i === step
                  ? "border-2 border-brand text-brand"
                  : "border border-surface-border text-ink-muted"
              )}
            >
              {i < step ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            <span className={cn("hidden text-xs sm:block", i === step ? "font-medium text-ink" : "text-ink-muted")}>
              {label}
            </span>
            {i < steps.length - 1 && <span className="h-px flex-1 bg-surface-border" />}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="flex flex-col gap-4">
          <Field label="Kunde">
            <Select
              value={companyId}
              onValueChange={(v) => {
                setCompanyId(v);
                setContactId("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Kunde auswählen…" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {contactsForCompany.length > 0 && (
            <Field label="Ansprechpartner">
              <Select value={contactId} onValueChange={setContactId}>
                <SelectTrigger>
                  <SelectValue placeholder="Ansprechpartner auswählen (optional)…" />
                </SelectTrigger>
                <SelectContent>
                  {contactsForCompany.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          <Field label="Titel der Vakanz">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z. B. Senior Java-Entwickler (m/w/d)"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Quelle">
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sourceOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Anstellungsart">
              <Select value={employmentType} onValueChange={setEmploymentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(employmentTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <Field label="Anforderungsprofil">
            <Textarea
              rows={5}
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="Fachliche und persönliche Anforderungen…"
            />
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Budget von">
              <Input type="number" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} />
            </Field>
            <Field label="Budget bis">
              <Input type="number" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} />
            </Field>
            <Field label="Währung">
              <Input value={currency} onChange={(e) => setCurrency(e.target.value)} />
            </Field>
          </div>
          <Field label="Einsatzort">
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="z. B. Berlin" />
          </Field>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <Field label="Gewünschter Startzeitpunkt">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <p className="text-sm text-ink-muted">
            Weitere Zusatzinformationen können später jederzeit im Vakanz-Detail ergänzt werden.
          </p>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-3 text-sm">
          <SummaryRow label="Kunde" value={selectedCompany?.name ?? "–"} />
          <SummaryRow label="Titel" value={title || "–"} />
          <SummaryRow label="Quelle" value={sourceOptions.find((o) => o.value === source)?.label ?? source} />
          <SummaryRow label="Anstellungsart" value={employmentTypeLabels[employmentType]} />
          <SummaryRow
            label="Budget"
            value={
              budgetMin || budgetMax
                ? `${formatCurrency(Number(budgetMin) || 0, currency)} – ${formatCurrency(Number(budgetMax) || 0, currency)}`
                : "–"
            }
          />
          <SummaryRow label="Einsatzort" value={location || "–"} />
          <SummaryRow label="Start" value={startDate || "–"} />
          <SummaryRow label="Anforderungen" value={requirements || "–"} />
          {error && <p className="text-status-danger">{error}</p>}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between border-t border-surface-border pt-4">
        <Button
          variant="secondary"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          Zurück
        </Button>
        {step < steps.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}>
            Weiter
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Speichert…" : "Vakanz speichern"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-ink">{label}</label>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-surface-border pb-2">
      <span className="text-ink-muted">{label}</span>
      <span className="max-w-[60%] text-right text-ink">{value}</span>
    </div>
  );
}
