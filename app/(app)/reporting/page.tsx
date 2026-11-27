import { eq, inArray } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db";
import { companies, offersCalculations, vacancies } from "@/lib/db/schema";
import { num, toIsoRequired } from "@/lib/db/crm";
import { isDemoMode } from "@/lib/demo/mode";
import { getVacancyTabCounts } from "@/lib/queries/vacancies";
import { PipelineFunnelChart } from "@/components/reporting/pipeline-funnel-chart";
import { RevenueTrendChart } from "@/components/reporting/revenue-trend-chart";
import { TopCustomersChart } from "@/components/reporting/top-customers-chart";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";

const stageLabels: Record<string, string> = {
  neue_anfrage: "Neue Anfragen",
  offen: "Offen",
  in_bearbeitung: "In Bearbeitung",
  besetzt: "Besetzt",
  geschlossen: "Geschlossen",
};

async function getReportingData() {
  if (isDemoMode()) {
    const supabase = createClient();
    const [tabCounts, { data: offers }, { data: openVacancies }] = await Promise.all([
      getVacancyTabCounts(),
      supabase.from("offers_calculations").select("created_at, monthly_revenue, margin_per_month"),
      supabase
        .from("vacancies")
        .select("company_id, status, company:companies(name)")
        .in("status", ["neue_anfrage", "offen", "in_bearbeitung"]),
    ]);
    return { tabCounts, offers: offers ?? [], vacancies: openVacancies ?? [] };
  }

  const db = getDb();
  const [tabCounts, offerRows, vacancyRows] = await Promise.all([
    getVacancyTabCounts(),
    db
      .select({
        createdAt: offersCalculations.createdAt,
        monthlyRevenue: offersCalculations.monthlyRevenue,
        marginPerMonth: offersCalculations.marginPerMonth,
      })
      .from(offersCalculations),
    db
      .select({
        companyId: vacancies.companyId,
        status: vacancies.status,
        companyName: companies.name,
      })
      .from(vacancies)
      .leftJoin(companies, eq(companies.id, vacancies.companyId))
      .where(inArray(vacancies.status, ["neue_anfrage", "offen", "in_bearbeitung"])),
  ]);

  return {
    tabCounts,
    offers: offerRows.map((o) => ({
      created_at: toIsoRequired(o.createdAt),
      monthly_revenue: num(o.monthlyRevenue),
      margin_per_month: num(o.marginPerMonth),
    })),
    vacancies: vacancyRows.map((v) => ({
      company_id: v.companyId,
      status: v.status,
      company: { name: v.companyName },
    })),
  };
}

export default async function ReportingPage() {
  const { tabCounts, offers, vacancies: openVacancies } = await getReportingData();

  const funnelData = Object.entries(tabCounts).map(([stage, count]) => ({
    stage: stageLabels[stage] ?? stage,
    count,
  }));

  const revenueByMonth = new Map<string, { revenue: number; margin: number }>();
  type OfferRow = {
    created_at: string;
    monthly_revenue: number | null;
    margin_per_month: number | null;
  };
  (offers as OfferRow[]).forEach((o) => {
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
  openVacancies.forEach((v: { company?: { name?: string | null } | null }) => {
    const name = v.company?.name ?? "Unbekannt";
    customerCounts.set(name, (customerCounts.get(name) ?? 0) + 1);
  });
  const topCustomers = Array.from(customerCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const totalRevenue = (offers as OfferRow[]).reduce((sum, o) => sum + (o.monthly_revenue ?? 0), 0);
  const totalMargin = (offers as OfferRow[]).reduce((sum, o) => sum + (o.margin_per_month ?? 0), 0);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Reporting"
        description="Kennzahlen zur Recruiting-Pipeline und Wirtschaftlichkeit."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Vakanzen in Bearbeitung" value={String(tabCounts.in_bearbeitung)} />
        <KpiCard label="Kalkulierter Umsatz/Monat (gesamt)" value={formatCurrency(totalRevenue)} />
        <KpiCard label="Deckungsbeitrag/Monat (gesamt)" value={formatCurrency(totalMargin)} />
      </div>

      <Panel className="p-5">
        <h2 className="mb-3 text-sm font-medium tracking-tight text-ink">Vakanzen-Pipeline</h2>
        <PipelineFunnelChart data={funnelData} />
      </Panel>

      <Panel className="p-5">
        <h2 className="mb-3 text-sm font-medium tracking-tight text-ink">Umsatz und Deckungsbeitrag je Monat</h2>
        {revenueTrend.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-muted">Noch keine Angebote kalkuliert.</p>
        ) : (
          <RevenueTrendChart data={revenueTrend} />
        )}
      </Panel>

      <Panel className="p-5">
        <h2 className="mb-3 text-sm font-medium tracking-tight text-ink">Top-Kunden nach offenen Vakanzen</h2>
        {topCustomers.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-muted">Keine offenen Vakanzen vorhanden.</p>
        ) : (
          <TopCustomersChart data={topCustomers} />
        )}
      </Panel>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <Panel className="p-5">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight text-ink">{value}</p>
    </Panel>
  );
}
