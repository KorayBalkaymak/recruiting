import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getVacancies, getVacancyTabCounts } from "@/lib/queries/vacancies";
import { VacancyTabsNav } from "@/components/vakanzen/vacancy-tabs-nav";
import { VacancyTable } from "@/components/vakanzen/vacancy-table";
import type { VacancyStatus } from "@/types/supabase";

export default async function VakanzenPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const tab = (searchParams.tab ?? "offen") as VacancyStatus;
  const [counts, vacancies] = await Promise.all([getVacancyTabCounts(), getVacancies(tab)]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Vakanzen</h1>
          <p className="text-sm text-ink-muted">Pipeline von der Anfrage bis zur Besetzung.</p>
        </div>
        <Button asChild>
          <Link href="/vakanzen/neu">
            <Plus className="h-4 w-4" />
            Vakanz anlegen
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border border-surface-border bg-white shadow-panel">
        <div className="px-4 pt-2">
          <VacancyTabsNav activeTab={tab} counts={counts} />
        </div>
        <VacancyTable tab={tab} vacancies={vacancies} />
      </div>
    </div>
  );
}
