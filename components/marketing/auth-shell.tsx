import Link from "next/link";
import { cn } from "@/lib/utils";

export const authLabelClass = "text-sm font-medium text-white/75";
export const authInputClass =
  "w-full rounded-md border border-white/15 bg-white/[0.06] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";
export const authButtonClass =
  "mt-1 rounded-md bg-brand px-3 py-2.5 text-sm font-medium text-navy transition-colors hover:bg-brand-hover hover:text-white";

export function AuthAlert({
  tone,
  children,
}: {
  tone: "error" | "ok";
  children: React.ReactNode;
}) {
  return (
    <p
      className={cn(
        "mb-4 rounded-md border px-3 py-2 text-sm",
        tone === "error"
          ? "border-red-400/25 bg-red-500/10 text-red-200"
          : "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
      )}
    >
      {children}
    </p>
  );
}

export function MarketingAuthShell({
  audience,
  kicker,
  title,
  description,
  children,
}: {
  audience: "recruiter" | "candidate";
  kicker: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const recruiterActive = audience === "recruiter";

  return (
    <div className="landing-shell landing-hero min-h-screen">
      <header className="border-b border-white/10">
        <div className="landing-wrap flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-xs font-semibold tracking-wide text-navy">
              CMS
            </span>
            <span className="text-sm font-medium tracking-[0.18em] text-white/90">TALENTS</span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/candidate/login"
              className={cn(
                "rounded-md px-3 py-2 text-sm transition-colors",
                recruiterActive ? "text-white/60 hover:text-white" : "bg-white/10 text-white"
              )}
            >
              Kandidaten
            </Link>
            <Link
              href="/login"
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                recruiterActive
                  ? "bg-brand text-navy hover:bg-brand-hover hover:text-white"
                  : "text-white/60 hover:text-white"
              )}
            >
              Recruiter
            </Link>
          </nav>
        </div>
      </header>

      <main className="py-14 sm:py-20">
        <div className="landing-wrap flex max-w-lg flex-col gap-8">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-brand">{kicker}</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
            <p className="mt-4 text-sm leading-relaxed text-white/55 sm:text-base">{description}</p>
          </div>
          <div className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-7">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
