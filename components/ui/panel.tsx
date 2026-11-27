import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("crm-panel", className)}>{children}</div>;
}

export function PanelHeader({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-surface-border px-5 py-3.5">
      <h2 className="text-sm font-medium tracking-tight text-ink">{title}</h2>
      {children}
    </div>
  );
}
