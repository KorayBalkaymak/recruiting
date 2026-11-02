import { getContracts, getFillableVacancies } from "@/lib/queries/contracts";
import { ContractTable } from "@/components/vertraege/contract-table";
import { FillableVacancies } from "@/components/vertraege/fillable-vacancies";

export default async function VertraegePage() {
  const [contracts, fillableVacancies] = await Promise.all([getContracts(), getFillableVacancies()]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-ink">Verträge</h1>
        <p className="text-sm text-ink-muted">
          Verträge aus erfolgreich besetzten Vakanzen verwalten.
        </p>
      </div>

      <FillableVacancies vacancies={fillableVacancies} />

      <div className="rounded-lg border border-surface-border bg-white shadow-panel">
        <div className="border-b border-surface-border px-5 py-3">
          <h2 className="text-sm font-medium text-ink">Alle Verträge</h2>
        </div>
        <ContractTable contracts={contracts} />
      </div>
    </div>
  );
}
