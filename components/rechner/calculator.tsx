"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Download, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RevenueDonutChart } from "@/components/rechner/revenue-donut-chart";
import { factorTierLabels } from "@/lib/labels";
import { calculateFromHourlyRate, calculateFromSalary, bruttoToNetto } from "@/lib/calculator";
import { cn, formatCurrency } from "@/lib/utils";
import { saveOfferCalculation } from "@/app/(app)/rechner/actions";
import type { FactorTier } from "@/lib/calculator";

type Option = { id: string; label: string };

export function Calculator({
  companies,
  candidates,
}: {
  companies: Option[];
  candidates: (Option & { hourlyRateNet: number | null })[];
}) {
  const [mode, setMode] = useState<"stundensatz" | "gehalt">("stundensatz");
  const [rateInputType, setRateInputType] = useState<"netto" | "brutto">("netto");
  const [hourlyRateInput, setHourlyRateInput] = useState("");
  const [monthlySalary, setMonthlySalary] = useState("6000");
  const [currency, setCurrency] = useState("EUR");
  const [durationMonths, setDurationMonths] = useState("6");
  const [location, setLocation] = useState("");
  const [factorTier, setFactorTier] = useState<FactorTier>("standard");

  const [companyId, setCompanyId] = useState("");
  const [candidateId, setCandidateId] = useState("");

  const [isPending, startTransition] = useTransition();
  const [savedOfferId, setSavedOfferId] = useState<string | null>(null);

  const factorValue = factorTierLabels[factorTier].factor;

  const hourlyRateNet = useMemo(() => {
    const raw = Number(hourlyRateInput) || 0;
    return rateInputType === "brutto" ? bruttoToNetto(raw) : raw;
  }, [hourlyRateInput, rateInputType]);

  const result = useMemo(() => {
    if (mode === "stundensatz") {
      return calculateFromHourlyRate(hourlyRateNet, factorValue);
    }
    return calculateFromSalary(Number(monthlySalary) || 0, factorValue);
  }, [mode, hourlyRateNet, monthlySalary, factorValue]);

  function handleCandidateSelect(id: string) {
    setCandidateId(id);
    const candidate = candidates.find((c) => c.id === id);
    if (candidate?.hourlyRateNet) {
      setMode("stundensatz");
      setRateInputType("netto");
      setHourlyRateInput(String(candidate.hourlyRateNet));
    }
  }

  function handleSave() {
    startTransition(async () => {
      const id = await saveOfferCalculation({
        mode,
        vacancyId: undefined,
        candidateId: candidateId || undefined,
        companyId: companyId || undefined,
        candidateHourlyRateNet: mode === "stundensatz" ? hourlyRateNet : result.candidateHourlyRateNet,
        candidateMonthlySalary: mode === "gehalt" ? Number(monthlySalary) : undefined,
        currency,
        assignmentDurationMonths: durationMonths ? Number(durationMonths) : undefined,
        assignmentLocation: location || undefined,
        factorTier,
        factorValue,
        result,
      });
      setSavedOfferId(id);
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-4 rounded-lg border border-surface-border bg-white p-5 shadow-panel">
        <Tabs value={mode} onValueChange={(v) => setMode(v as "stundensatz" | "gehalt")}>
          <TabsList>
            <TabsTrigger value="stundensatz">Modus 1: Stundensatz</TabsTrigger>
            <TabsTrigger value="gehalt">Modus 2: Gehalt</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Kunde (optional)">
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="Kunde auswählen…" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Kandidat (optional)">
            <Select value={candidateId} onValueChange={handleCandidateSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Kandidat auswählen…" />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        {mode === "stundensatz" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Kandidaten-Stundensatz">
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={hourlyRateInput}
                  onChange={(e) => setHourlyRateInput(e.target.value)}
                  placeholder="z. B. 85"
                />
                <Select value={rateInputType} onValueChange={(v) => setRateInputType(v as "netto" | "brutto")}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="netto">Netto</SelectItem>
                    <SelectItem value="brutto">Brutto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {rateInputType === "brutto" && (
                <p className="text-xs text-ink-muted">
                  Entspricht {formatCurrency(hourlyRateNet, currency)} netto (Faktor 1,2).
                </p>
              )}
            </Field>
            <Field label="Währung">
              <Input value={currency} onChange={(e) => setCurrency(e.target.value)} />
            </Field>
            <Field label="Einsatzdauer (Monate)">
              <Input type="number" value={durationMonths} onChange={(e) => setDurationMonths(e.target.value)} />
            </Field>
            <Field label="Einsatzort">
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="z. B. Berlin" />
            </Field>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Gewünschtes Monatsgehalt">
              <Input type="number" value={monthlySalary} onChange={(e) => setMonthlySalary(e.target.value)} />
            </Field>
            <Field label="Währung">
              <Input value={currency} onChange={(e) => setCurrency(e.target.value)} />
            </Field>
            <p className="col-span-2 text-xs text-ink-muted">
              Automatische Stundensatz-Basis: {formatCurrency(result.candidateHourlyRateNet, currency)} / Std.
              (bei 160 Std./Monat)
            </p>
          </div>
        )}

        <div>
          <p className="mb-2 text-sm font-medium text-ink">Faktor-Auswahl</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(Object.entries(factorTierLabels) as [FactorTier, (typeof factorTierLabels)[FactorTier]][]).map(
              ([tier, meta]) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setFactorTier(tier)}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-colors",
                    factorTier === tier
                      ? "border-brand bg-brand-light"
                      : "border-surface-border hover:border-brand/50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn("text-sm font-semibold", factorTier === tier ? "text-brand" : "text-ink")}>
                      {meta.label}
                    </span>
                    {factorTier === tier && <Check className="h-3.5 w-3.5 text-brand" />}
                  </div>
                  <span className="text-xs text-ink-muted">Faktor {meta.factor.toFixed(1)}</span>
                  <p className="mt-1 text-[11px] leading-snug text-ink-muted">{meta.description}</p>
                </button>
              )
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-surface-border bg-brand p-5 text-white shadow-panel">
          <p className="text-xs uppercase tracking-wide text-white/80">
            Empfohlener Verrechnungssatz (netto, pro Stunde)
          </p>
          <p className="mt-1 text-3xl font-semibold">
            {formatCurrency(result.recommendedHourlyRate, currency)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <KpiCard label="Umsatz / Monat" value={formatCurrency(result.monthlyRevenue, currency)} />
          <KpiCard label="Deckungsbeitrag / Std." value={formatCurrency(result.marginPerHour, currency)} />
          <KpiCard label="Deckungsbeitrag / Monat" value={formatCurrency(result.marginPerMonth, currency)} />
          <KpiCard label="Deckungsbeitrag / Jahr" value={formatCurrency(result.marginPerYear, currency)} />
        </div>

        <div className="rounded-lg border border-surface-border bg-white p-5 shadow-panel">
          <p className="mb-3 text-sm font-medium text-ink">Umsatzverteilung pro Stunde</p>
          <RevenueDonutChart
            candidateShare={result.candidateHourlyRateNet}
            marginShare={result.marginPerHour}
            currency={currency}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={handleSave} disabled={isPending}>
            <Save className="h-4 w-4" />
            {isPending ? "Speichert…" : "Angebot übernehmen"}
          </Button>
          {savedOfferId && (
            <Button variant="secondary" asChild>
              <Link href={`/rechner/pdf/${savedOfferId}?download=1`} target="_blank">
                <Download className="h-4 w-4" />
                Als PDF exportieren
              </Link>
            </Button>
          )}
          {savedOfferId && (
            <p className="text-center text-xs text-status-done">
              Angebot als Entwurf gespeichert — siehe Liste unten.
            </p>
          )}
        </div>
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

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-surface-border bg-white p-3 shadow-panel">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="mt-1 text-base font-semibold text-ink">{value}</p>
    </div>
  );
}
