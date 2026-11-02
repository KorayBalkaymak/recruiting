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
    <nav className="flex items-center gap-1 overflow-x-auto border-b border-surface-border">
      {tabs.map((tab) => {
        const isActive = tab.value === activeTab;
        return (
          <Link
            key={tab.value}
            href={tab.value === "alle" ? "/kandidaten" : `/kandidaten?tab=${tab.value}`}
            className={cn(
              "relative flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-sm transition-colors",
              isActive ? "font-medium text-brand" : "text-ink-muted hover:text-ink"
            )}
          >
            {tab.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-xs",
                isActive ? "bg-brand-light text-brand" : "bg-slate-100 text-ink-muted"
              )}
            >
              {counts[tab.value] ?? 0}
            </span>
            {isActive && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
