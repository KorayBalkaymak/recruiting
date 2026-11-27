import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
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
    <div className="flex flex-col gap-5">
      <PageHeader title="Vakanzen" description="Pipeline von der Anfrage bis zur Besetzung.">
        <Button asChild>
          <Link href="/vakanzen/neu">
            <Plus className="h-4 w-4" />
            Vakanz anlegen
          </Link>
        </Button>
      </PageHeader>

      <Panel>
        <div className="px-4 pt-2">
          <VacancyTabsNav activeTab={tab} counts={counts} />
        </div>
        <VacancyTable tab={tab} vacancies={vacancies} />
      </Panel>
    </div>
  );
}
