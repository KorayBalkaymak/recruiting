import Link from "next/link";
import { loginAction } from "./actions";
import { isDemoMode } from "@/lib/demo/mode";
import {
  AuthAlert,
  MarketingAuthShell,
  authButtonClass,
  authFineClass,
  authInputClass,
  authLabelClass,
  authLinkClass,
} from "@/components/marketing/auth-shell";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; message?: string };
}) {
  return (
    <MarketingAuthShell
      audience="recruiter"
      kicker="Intern"
      title="Recruiter-Anmeldung"
      description="Zugang zum CMS-Arbeitsbereich: Kunden, Vakanzen, Pipeline und Portal-Prüfungen. Nur für das interne Team."
    >
      {searchParams.message ? <AuthAlert tone="ok">{searchParams.message}</AuthAlert> : null}
      {searchParams.error ? <AuthAlert tone="error">{searchParams.error}</AuthAlert> : null}

      <form action={loginAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className={authLabelClass}>
            E-Mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="username"
            placeholder="recruiter@cms-platform.de"
            className={authInputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className={authLabelClass}>
            Passwort
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className={authInputClass}
          />
        </div>
        <button type="submit" className={authButtonClass}>
          Anmelden
        </button>
      </form>

      <p className="mt-5">
        <Link href="/login/forgot-password" className={`text-sm ${authLinkClass}`}>
          Passwort vergessen?
        </Link>
      </p>

      {isDemoMode() ? (
        <p className={`mt-5 leading-relaxed ${authFineClass}`}>
          Demo: anna.recruiter@cms-platform.de / demo1234
        </p>
      ) : null}

      <p className={`mt-6 ${authFineClass}`}>
        Kandidat?{" "}
        <Link href="/candidate/login" className={authLinkClass}>
          Zum Portal
        </Link>
        {" · "}
        <Link href="/" className={authLinkClass}>
          Startseite
        </Link>
      </p>
    </MarketingAuthShell>
  );
}
