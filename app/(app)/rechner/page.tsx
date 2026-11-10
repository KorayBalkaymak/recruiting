import { asc, desc, ne } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db";
import { candidates, companies } from "@/lib/db/schema";
import { num } from "@/lib/db/crm";
import { isDemoMode } from "@/lib/demo/mode";
import { Calculator } from "@/components/rechner/calculator";
import { OffersList } from "@/components/rechner/offers-list";

async function getCalculatorOptions() {
  if (isDemoMode()) {
    const supabase = createClient();
    const [{ data: companyRows }, { data: candidateRows }] = await Promise.all([
      supabase.from("companies").select("id, name").order("name"),
      supabase
        .from("candidates")
        .select("id, first_name, last_name, anonymized_title, hourly_rate_net")
        .neq("status", "inaktiv")
        .order("updated_at", { ascending: false }),
    ]);
    return { companies: companyRows ?? [], candidates: candidateRows ?? [] };
  }

  const db = getDb();
  const [companyRows, candidateRows] = await Promise.all([
    db
      .select({ id: companies.id, name: companies.name })
      .from(companies)
      .orderBy(asc(companies.name)),
    db
      .select({
        id: candidates.id,
        firstName: candidates.firstName,
        lastName: candidates.lastName,
        anonymizedTitle: candidates.anonymizedTitle,
        hourlyRateNet: candidates.hourlyRateNet,
      })
      .from(candidates)
      .where(ne(candidates.status, "inaktiv"))
      .orderBy(desc(candidates.updatedAt)),
  ]);

  return {
    companies: companyRows,
    candidates: candidateRows.map((c) => ({
      id: c.id,
      first_name: c.firstName,
      last_name: c.lastName,
      anonymized_title: c.anonymizedTitle,
      hourly_rate_net: num(c.hourlyRateNet),
    })),
  };
}

export default async function RechnerPage() {
  const { companies: companyOptions, candidates: candidateOptions } = await getCalculatorOptions();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-ink">Verrechnungssatzrechner</h1>
        <p className="text-sm text-ink-muted">
          Kalkuliere Verrechnungssätze, Deckungsbeiträge und erzeuge Angebote.
        </p>
      </div>

      <Calculator
        companies={companyOptions.map((c: { id: string; name: string }) => ({
          id: c.id,
          label: c.name,
        }))}
        candidates={candidateOptions.map(
          (c: {
            id: string;
            first_name: string;
            last_name: string;
            anonymized_title: string | null;
            hourly_rate_net: number | null;
          }) => ({
            id: c.id,
            label: `${c.first_name} ${c.last_name}${c.anonymized_title ? ` — ${c.anonymized_title}` : ""}`,
            hourlyRateNet: c.hourly_rate_net,
          })
        )}
      />

      <OffersList />
    </div>
  );
}
