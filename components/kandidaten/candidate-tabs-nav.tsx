import Link from "next/link";
import { cn } from "@/lib/utils";

type TabDef = { value: string; label: string };

export function CandidateTabsNav({
  tabs,
  counts,
  activeTab,
}: {
  tabs: readonly TabDef[];
  counts: Record<string, number>;
  activeTab: string;
}) {
  return (
    <nav className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const isActive = tab.value === activeTab;
        return (
          <Link
            key={tab.value}
            href={tab.value === "alle" ? "/kandidaten" : `/kandidaten?tab=${tab.value}`}
            className={cn(
              "flex min-w-[7.5rem] flex-1 items-center justify-between gap-3 rounded-2xl px-4 py-3.5 transition-all",
              isActive
                ? "bg-[#141C6B] text-white shadow-[0_16px_40px_-24px_rgba(20,28,107,0.9)]"
                : "border border-[#E6E8F0] bg-white text-ink hover:border-[#141C6B]/25 hover:bg-[#F7F8FC]"
            )}
          >
            <span className={cn("text-[13px] font-medium", isActive ? "text-white" : "text-ink")}>
              {tab.label}
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                isActive ? "bg-white/15 text-white" : "bg-[#F4F5FB] text-[#141C6B]"
              )}
            >
              {counts[tab.value] ?? 0}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
