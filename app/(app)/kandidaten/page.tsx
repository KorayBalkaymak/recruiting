import Link from "next/link";
import { FileWarning, Plus, Search } from "lucide-react";
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
  const query = searchParams.q ?? "";
  const [counts, candidates] = await Promise.all([
    getCandidateTabCounts(),
    getCandidates(tab, query),
  ]);
  const missingActive = tab === MISSING_DOCUMENTS_TAB;
  const total = counts.alle ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <LiveRefresh />

      <section className="relative overflow-hidden rounded-none bg-[#1A1A1A] px-6 py-7 text-white sm:px-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-[#141C6B] blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 right-20 h-48 w-72 rounded-full bg-[#E4572E]/25 blur-3xl"
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[36rem]">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#8B96D9]">
              Talentpipeline
            </p>
            <h1 className="mt-3 text-[clamp(1.85rem,3vw,2.55rem)] font-normal leading-[1.05] tracking-[-0.04em]">
              Kandidaten
            </h1>
            <p className="mt-3 max-w-[42ch] text-sm leading-6 text-white/60">
              {total} Profile in der Übersicht. Status, Satz und Verfügbarkeit auf einen Blick.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
            <form action="/kandidaten" className="relative min-w-0 flex-1 lg:w-72">
              {tab !== "alle" ? <input type="hidden" name="tab" value={tab} /> : null}
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                name="q"
                defaultValue={query}
                placeholder="Name, Titel, E-Mail…"
                className="h-11 w-full rounded-none border border-white/10 bg-white/10 pl-10 pr-4 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
              />
            </form>
            <Link
              href="/kandidaten/neu"
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-none bg-[#E4572E] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#c94a26]"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              Neuer Kandidat
            </Link>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3">
        <CandidateTabsNav tabs={candidateTabs} counts={counts} activeTab={tab} />
        <Link
          href={missingActive ? "/kandidaten" : `/kandidaten?tab=${MISSING_DOCUMENTS_TAB}`}
          className={cn(
            "flex items-center justify-between gap-4 rounded-none px-4 py-3.5 transition-all",
            missingActive
              ? "bg-[#E4572E] text-white shadow-[0_16px_40px_-24px_rgba(228,87,46,0.9)]"
              : "border border-[#E6E8F0] bg-white hover:border-[#E4572E]/30"
          )}
        >
          <span className="flex items-center gap-3">
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-none",
                missingActive ? "bg-white/15 text-white" : "bg-[#FFF1EC] text-[#E4572E]"
              )}
            >
              <FileWarning className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <span>
              <span className={cn("block text-sm font-medium", missingActive ? "text-white" : "text-ink")}>
                Ohne Unterlagen
              </span>
              <span className={cn("block text-xs", missingActive ? "text-white/75" : "text-ink-muted")}>
                Registriert, aber Lebenslauf oder Qualifikation fehlt
              </span>
            </span>
          </span>
          <span
            className={cn(
              "text-2xl font-semibold tabular-nums tracking-tight",
              missingActive ? "text-white" : "text-ink"
            )}
          >
            {counts[MISSING_DOCUMENTS_TAB] ?? 0}
          </span>
        </Link>
      </div>

      <section
        className={cn(
          "overflow-hidden rounded-xl",
          tab === "alle"
            ? "bg-[#E4572E] text-white"
            : "border border-[#E6E8F0] bg-[#F7F8FC]"
        )}
      >
        <div className="flex items-center justify-between px-3 py-2">
          <p
            className={cn(
              "text-[11px] font-medium uppercase tracking-[0.16em]",
              tab === "alle" ? "text-white" : "text-[#141C6B]"
            )}
          >
            {missingActive ? "Fehlende Unterlagen" : candidateTabs.find((item) => item.value === tab)?.label ?? "Liste"}
          </p>
          <p className={cn("text-xs", tab === "alle" ? "text-white/75" : "text-ink-muted")}>
            {candidates.length} sichtbar
          </p>
        </div>
        <CandidateTable candidates={candidates} tab={tab} inverted={tab === "alle"} />
      </section>
    </div>
  );
}
