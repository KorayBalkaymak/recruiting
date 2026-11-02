import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { candidateTabs } from "@/lib/labels";
import { getCandidateTabCounts, getCandidates } from "@/lib/queries/candidates";
import { CandidateTable } from "@/components/kandidaten/candidate-table";
import { CandidateTabsNav } from "@/components/kandidaten/candidate-tabs-nav";

export default async function KandidatenPage({
  searchParams,
}: {
  searchParams: { tab?: string; q?: string };
}) {
  const tab = searchParams.tab ?? "alle";
  const [counts, candidates] = await Promise.all([
    getCandidateTabCounts(),
    getCandidates(tab, searchParams.q),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Kandidaten</h1>
          <p className="text-sm text-ink-muted">
            Verwalte Profile, Status und anonymisierte Exposés.
          </p>
        </div>
        <Button asChild>
          <Link href="/kandidaten/neu">
            <Plus className="h-4 w-4" />
            Neuer Kandidat
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border border-surface-border bg-white shadow-panel">
        <div className="px-4 pt-2">
          <CandidateTabsNav tabs={candidateTabs} counts={counts} activeTab={tab} />
        </div>
        <CandidateTable candidates={candidates} />
      </div>
    </div>
  );
}
