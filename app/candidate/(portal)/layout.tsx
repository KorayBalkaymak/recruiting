import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionCandidate, getSessionStaff } from "@/lib/auth";
import { candidateLogoutAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function CandidatePortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staff = await getSessionStaff();
  if (staff) {
    redirect("/");
  }

  const candidate = await getSessionCandidate();
  if (!candidate) {
    redirect("/candidate/login");
  }

  const links = [
    { href: "/candidate/dashboard", label: "Dashboard" },
    { href: "/candidate/profile", label: "Profil" },
    { href: "/candidate/status", label: "Status" },
  ];

  return (
    <div className="min-h-screen bg-surface-subtle">
      <header className="border-b border-surface-border bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand text-sm font-semibold text-white">
              CMS
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">Kandidatenportal</p>
              <p className="text-xs text-ink-muted">{candidate.fullName}</p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-2 text-sm text-ink-muted hover:bg-surface-subtle hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
            <form action={candidateLogoutAction}>
              <button
                type="submit"
                className="rounded-md px-3 py-2 text-sm text-status-danger hover:bg-red-50"
              >
                Abmelden
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
