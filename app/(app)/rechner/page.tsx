import { createClient } from "@/lib/supabase/server";
import { Calculator } from "@/components/rechner/calculator";
import { OffersList } from "@/components/rechner/offers-list";

export default async function RechnerPage() {
  const supabase = createClient();

  const [{ data: companies }, { data: candidates }] = await Promise.all([
    supabase.from("companies").select("id, name").order("name"),
    supabase
      .from("candidates")
      .select("id, first_name, last_name, anonymized_title, hourly_rate_net")
      .neq("status", "inaktiv")
      .order("updated_at", { ascending: false }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-ink">Verrechnungssatzrechner</h1>
        <p className="text-sm text-ink-muted">
          Kalkuliere Verrechnungssätze, Deckungsbeiträge und erzeuge Angebote.
        </p>
      </div>

      <Calculator
        companies={(companies ?? []).map((c) => ({ id: c.id, label: c.name }))}
        candidates={(candidates ?? []).map((c) => ({
          id: c.id,
          label: `${c.first_name} ${c.last_name}${c.anonymized_title ? ` — ${c.anonymized_title}` : ""}`,
          hourlyRateNet: c.hourly_rate_net,
        }))}
      />

      <OffersList />
    </div>
  );
}
