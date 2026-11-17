import Link from "next/link";
import { cn } from "@/lib/utils";

export const authLabelClass =
  "text-[11px] font-medium uppercase tracking-[0.16em] text-navy";
export const authInputClass =
  "h-11 w-full rounded-none border border-surface-border bg-surface-subtle px-3.5 text-sm text-ink placeholder:text-ink-muted transition-colors focus:border-brand focus:bg-white focus:outline-none";
export const authButtonClass =
  "mt-1 h-11 w-full rounded-none bg-brand text-sm font-semibold tracking-wide text-navy transition-colors hover:bg-brand-hover hover:text-white";
export const authLinkClass = "font-medium text-navy transition-colors hover:text-brand-deep";
export const authMutedClass = "text-sm text-ink-muted";
export const authFineClass = "text-xs text-ink-muted";

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
        "mb-5 border px-3.5 py-2.5 text-sm",
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-800"
      )}
    >
      {children}
    </p>
  );
}

export function MarketingAuthShell({
  audience: _audience,
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
  return (
    <div className="landing-shell landing-hero min-h-screen">
      <header className="landing-header">
        <div className="landing-wrap flex h-16 items-center">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center bg-brand text-xs font-semibold tracking-wide text-navy">
              CMS
            </span>
            <span className="text-sm font-medium tracking-[0.18em] text-navy">TALENTS</span>
          </Link>
        </div>
      </header>

      <main className="py-14 sm:py-20">
        <div className="landing-wrap flex max-w-lg flex-col gap-8">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-brand">{kicker}</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
            <p className="mt-4 text-sm leading-relaxed text-white/55 sm:text-base">{description}</p>
          </div>
          <div className="w-full border border-surface-border border-t-[3px] border-t-brand bg-white p-8 sm:p-10">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
