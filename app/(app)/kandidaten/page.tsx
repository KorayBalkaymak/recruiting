import Link from "next/link";
import { FileWarning, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { candidateTabs } from "@/lib/labels";
import { MISSING_DOCUMENTS_TAB } from "@/lib/candidate/recruiter-workflow";
import { getCandidateTabCounts, getCandidates } from "@/lib/queries/candidates";
import { CandidateTable } from "@/components/kandidaten/candidate-table";
import { CandidateTabsNav } from "@/components/kandidaten/candidate-tabs-nav";
import { LiveRefresh } from "@/components/kandidaten/live-refresh";
import { cn } from "@/lib/utils";

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
  const missingActive = tab === MISSING_DOCUMENTS_TAB;

  return (
    <div className="flex flex-col gap-4">
      <LiveRefresh />
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

      <Link
        href={missingActive ? "/kandidaten" : `/kandidaten?tab=${MISSING_DOCUMENTS_TAB}`}
        className={cn(
          "flex items-center justify-between gap-4 rounded-lg border border-surface-border bg-white p-5 shadow-panel transition-colors hover:bg-surface-subtle",
          missingActive && "ring-1 ring-brand/30"
        )}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-light text-brand">
            <FileWarning className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <div>
            <p className="text-sm font-medium text-ink">Noch keine Unterlagen</p>
            <p className="text-xs text-ink-muted">
              Registrierte Kandidaten ohne hochgeladenen Lebenslauf
            </p>
          </div>
        </div>
        <p className="text-[1.65rem] font-semibold tracking-tight text-ink">
          {counts[MISSING_DOCUMENTS_TAB] ?? 0}
        </p>
      </Link>

      <div className="rounded-lg border border-surface-border bg-white shadow-panel">
        <div className="px-4 pt-2">
          <CandidateTabsNav tabs={candidateTabs} counts={counts} activeTab={tab} />
        </div>
        <CandidateTable candidates={candidates} tab={tab} />
      </div>
    </div>
  );
}
