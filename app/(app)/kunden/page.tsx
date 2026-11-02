import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCompanies, getCompanyTabCounts, type CompanyTab } from "@/lib/queries/companies";
import { CompanyTabsNav } from "@/components/kunden/company-tabs-nav";
import { CompanyTable } from "@/components/kunden/company-table";

export default async function KundenPage({
  searchParams,
}: {
  searchParams: { tab?: string; period?: string; q?: string };
}) {
  const tab = (searchParams.tab ?? "alle") as CompanyTab;
  const [counts, companies] = await Promise.all([
    getCompanyTabCounts(),
    getCompanies(tab, {
      minMonthsWithoutVacancy: searchParams.period ? Number(searchParams.period) : undefined,
      search: searchParams.q,
    }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Kunden</h1>
          <p className="text-sm text-ink-muted">
            Behalte Status, Ansprechpartner und Historie deiner Kunden im Blick.
          </p>
        </div>
        <Button asChild>
          <Link href="/kunden/neu">
            <Plus className="h-4 w-4" />
            Neuer Kunde
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border border-surface-border bg-white shadow-panel">
        <div className="px-4 pt-2">
          <CompanyTabsNav activeTab={tab} counts={counts} activePeriod={searchParams.period} />
        </div>
        <CompanyTable companies={companies} />
      </div>
    </div>
  );
}
