import Link from "next/link";
import { cn } from "@/lib/utils";

const tabs = [
  { value: "alle", label: "Alle Kunden" },
  { value: "neukunde", label: "Neukunden" },
  { value: "aktiv", label: "Aktiv" },
  { value: "ohne_aktive_vakanz", label: "Ohne aktive Vakanz" },
  { value: "inaktiv", label: "Inaktiv" },
] as const;

const periodOptions = [
  { value: "3", label: "> 3 Monate" },
  { value: "6", label: "> 6 Monate" },
  { value: "12", label: "> 12 Monate" },
];

export function CompanyTabsNav({
  activeTab,
  counts,
  activePeriod,
}: {
  activeTab: string;
  counts: Record<string, number>;
  activePeriod?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border">
      <nav className="flex items-center gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.value === activeTab;
          return (
            <Link
              key={tab.value}
              href={tab.value === "alle" ? "/kunden" : `/kunden?tab=${tab.value}`}
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
              {isActive && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand" />}
            </Link>
          );
        })}
      </nav>

      {activeTab === "ohne_aktive_vakanz" && (
        <div className="flex items-center gap-1.5 pb-2 pr-1 text-xs">
          <span className="text-ink-muted">Zeitraum ohne Vakanz:</span>
          {periodOptions.map((p) => (
            <Link
              key={p.value}
              href={`/kunden?tab=ohne_aktive_vakanz&period=${p.value}`}
              className={cn(
                "rounded-full border px-2.5 py-1 transition-colors",
                activePeriod === p.value
                  ? "border-brand bg-brand-light text-brand"
                  : "border-surface-border text-ink-muted hover:border-brand hover:text-brand"
              )}
            >
              {p.label}
            </Link>
          ))}
          {activePeriod && (
            <Link href="/kunden?tab=ohne_aktive_vakanz" className="text-ink-muted underline">
              Zurücksetzen
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
