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
            className="flex min-w-[6.5rem] flex-1 items-center justify-between gap-2 rounded-none bg-[#141C6B] px-3 py-2 text-white"
          >
            <span className="text-[13px] font-medium text-white">{tab.label}</span>
            <span
              className={cn(
                "rounded-none px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                isActive ? "border border-white text-white" : "text-white"
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
