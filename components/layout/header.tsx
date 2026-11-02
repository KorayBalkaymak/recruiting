"use client";

import { Bell, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/utils";

type HeaderProps = {
  currentUser?: {
    fullName: string;
    email: string;
    role: string;
  } | null;
  unreadNotifications?: number;
};

export function Header({ currentUser, unreadNotifications = 0 }: HeaderProps) {
  const [firstName, lastName] = (currentUser?.fullName ?? "").split(" ");

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-surface-border bg-white px-6">
      <div className="relative flex-1 max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
        <input
          type="search"
          placeholder="Suche nach Kandidaten, Kunden, Vakanzen…"
          className="w-full rounded-md border border-surface-border bg-surface-subtle py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      <button
        type="button"
        aria-label="Benachrichtigungen"
        className="relative flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink"
      >
        <Bell className="h-4.5 w-4.5" strokeWidth={1.75} />
        {unreadNotifications > 0 && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand ring-2 ring-white" />
        )}
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 transition-colors hover:bg-surface-subtle"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-light text-xs font-semibold text-brand">
              {initials(firstName, lastName) || "??"}
            </span>
            <span className="hidden text-left text-sm leading-tight sm:block">
              <span className="block font-medium text-ink">
                {currentUser?.fullName ?? "Unbekannter Nutzer"}
              </span>
              <span className="block text-xs text-ink-muted">
                {currentUser?.role ?? ""}
              </span>
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>{currentUser?.email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Profil & Einstellungen</DropdownMenuItem>
          <DropdownMenuItem>Nutzerverwaltung</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-status-danger focus:text-status-danger">
            Abmelden
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
