import { getContracts, getFillableVacancies } from "@/lib/queries/contracts";
import { ContractTable } from "@/components/vertraege/contract-table";
import { FillableVacancies } from "@/components/vertraege/fillable-vacancies";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelHeader } from "@/components/ui/panel";

export default async function VertraegePage() {
  const [contracts, fillableVacancies] = await Promise.all([getContracts(), getFillableVacancies()]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Verträge"
        description="Verträge aus erfolgreich besetzten Vakanzen verwalten."
      />

      <FillableVacancies vacancies={fillableVacancies} />

      <Panel>
        <PanelHeader title="Alle Verträge" />
        <ContractTable contracts={contracts} />
      </Panel>
    </div>
  );
}
