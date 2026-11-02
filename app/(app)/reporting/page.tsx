import { createClient } from "@/lib/supabase/server";
import { getVacancyTabCounts } from "@/lib/queries/vacancies";
import { PipelineFunnelChart } from "@/components/reporting/pipeline-funnel-chart";
import { RevenueTrendChart } from "@/components/reporting/revenue-trend-chart";
import { TopCustomersChart } from "@/components/reporting/top-customers-chart";
import { formatCurrency } from "@/lib/utils";

const stageLabels: Record<string, string> = {
  neue_anfrage: "Neue Anfragen",
  offen: "Offen",
  in_bearbeitung: "In Bearbeitung",
  besetzt: "Besetzt",
  geschlossen: "Geschlossen",
};

export default async function ReportingPage() {
  const supabase = createClient();

  const [tabCounts, { data: offers }, { data: vacancies }] = await Promise.all([
    getVacancyTabCounts(),
    supabase.from("offers_calculations").select("created_at, monthly_revenue, margin_per_month"),
    supabase
      .from("vacancies")
      .select("company_id, status, company:companies(name)")
      .in("status", ["neue_anfrage", "offen", "in_bearbeitung"]),
  ]);

  const funnelData = Object.entries(tabCounts).map(([stage, count]) => ({
    stage: stageLabels[stage] ?? stage,
    count,
  }));

  const revenueByMonth = new Map<string, { revenue: number; margin: number }>();
  (offers ?? []).forEach((o) => {
    const month = new Intl.DateTimeFormat("de-DE", { month: "short", year: "2-digit" }).format(
      new Date(o.created_at)
    );
    const entry = revenueByMonth.get(month) ?? { revenue: 0, margin: 0 };
    entry.revenue += o.monthly_revenue ?? 0;
    entry.margin += o.margin_per_month ?? 0;
    revenueByMonth.set(month, entry);
  });
  const revenueTrend = Array.from(revenueByMonth.entries()).map(([month, v]) => ({ month, ...v }));

  const customerCounts = new Map<string, number>();
  (vacancies ?? []).forEach((v: any) => {
    const name = v.company?.name ?? "Unbekannt";
    customerCounts.set(name, (customerCounts.get(name) ?? 0) + 1);
  });
  const topCustomers = Array.from(customerCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const totalRevenue = (offers ?? []).reduce((sum, o) => sum + (o.monthly_revenue ?? 0), 0);
  const totalMargin = (offers ?? []).reduce((sum, o) => sum + (o.margin_per_month ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-ink">Reporting</h1>
        <p className="text-sm text-ink-muted">Kennzahlen zur Recruiting-Pipeline und Wirtschaftlichkeit.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Vakanzen in Bearbeitung" value={String(tabCounts.in_bearbeitung)} />
        <KpiCard label="Kalkulierter Umsatz/Monat (gesamt)" value={formatCurrency(totalRevenue)} />
        <KpiCard label="Deckungsbeitrag/Monat (gesamt)" value={formatCurrency(totalMargin)} />
      </div>

      <div className="rounded-lg border border-surface-border bg-white p-5 shadow-panel">
        <h2 className="mb-3 text-sm font-medium text-ink">Vakanzen-Pipeline (Funnel)</h2>
        <PipelineFunnelChart data={funnelData} />
      </div>

      <div className="rounded-lg border border-surface-border bg-white p-5 shadow-panel">
        <h2 className="mb-3 text-sm font-medium text-ink">Umsatz &amp; Deckungsbeitrag je Monat</h2>
        {revenueTrend.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-muted">Noch keine Angebote kalkuliert.</p>
        ) : (
          <RevenueTrendChart data={revenueTrend} />
        )}
      </div>

      <div className="rounded-lg border border-surface-border bg-white p-5 shadow-panel">
        <h2 className="mb-3 text-sm font-medium text-ink">Top-Kunden nach offenen Vakanzen</h2>
        {topCustomers.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-muted">Keine offenen Vakanzen vorhanden.</p>
        ) : (
          <TopCustomersChart data={topCustomers} />
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-surface-border bg-white p-4 shadow-panel">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold text-ink">{value}</p>
    </div>
  );
}
