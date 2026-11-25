"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { candidateLogoutAction } from "@/app/candidate/actions";
import { cn } from "@/lib/utils";

const links = [
  { href: "/candidate/dashboard", label: "Übersicht" },
  { href: "/candidate/profile", label: "Profil" },
  { href: "/candidate/status", label: "Prüfung" },
];

export function CandidatePortalNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-1">
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "relative px-3 py-2 text-[13px] tracking-wide transition-colors",
              active ? "font-medium text-white" : "text-white/55 hover:text-white"
            )}
          >
            {link.label}
            {active ? (
              <span className="absolute inset-x-3 -bottom-px h-px bg-[#8B96D9]" />
            ) : null}
          </Link>
        );
      })}
      <form action={candidateLogoutAction}>
        <button
          type="submit"
          className="px-3 py-2 text-[13px] text-white/45 transition-colors hover:text-white"
        >
          Abmelden
        </button>
      </form>
    </nav>
  );
}
