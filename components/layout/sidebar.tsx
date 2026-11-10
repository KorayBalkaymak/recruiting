"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "@/lib/nav-config";
import { cn } from "@/lib/utils";

type SidebarProps = {
  openRequestsCount?: number;
  canManageUsers?: boolean;
};

export function Sidebar({ openRequestsCount = 0, canManageUsers = false }: SidebarProps) {
  const pathname = usePathname();
  const visibleItems = navItems.filter(
    (item) => !item.requiresUserManager || canManageUsers
  );

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-sm font-semibold text-white">
          CMS
        </div>
        <span className="text-sm font-medium tracking-tight text-white">
          Recruiting-Plattform
        </span>
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-0.5">
          {visibleItems.map((item) => {
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            const badgeCount =
              item.badgeCountKey === "openRequests" ? openRequestsCount : undefined;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "group flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-brand text-white"
                      : "text-sidebar-muted hover:bg-sidebar-hover hover:text-white"
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    {item.label}
                  </span>
                  {!!badgeCount && (
                    <span
                      className={cn(
                        "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium",
                        isActive ? "bg-white/20 text-white" : "bg-brand text-white"
                      )}
                    >
                      {badgeCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border px-5 py-4 text-xs text-sidebar-muted">
        Version 0.1 · Interner Zugriff
      </div>
    </aside>
  );
}
