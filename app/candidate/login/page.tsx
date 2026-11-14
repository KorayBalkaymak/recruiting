import Link from "next/link";
import { redirect } from "next/navigation";
import { peekCandidateSession, peekStaffSession } from "@/lib/auth/public-session";
import { DEMO_CANDIDATE_LOGIN_HINT } from "@/lib/demo/candidate-accounts";
import { isDemoMode } from "@/lib/demo/mode";
import { candidateLoginAction } from "../actions";
import {
  AuthAlert,
  MarketingAuthShell,
  authButtonClass,
  authInputClass,
  authLabelClass,
} from "@/components/marketing/auth-shell";

export default async function CandidateLoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const staff = await peekStaffSession();
  if (staff) redirect("/uebersicht");
  const candidate = await peekCandidateSession();
  if (candidate) redirect("/candidate/dashboard");

  return (
    <MarketingAuthShell
      audience="candidate"
      kicker="Portal"
      title="Kandidaten-Anmeldung"
      description="Melde dich an, um dein Profil zu pflegen, Unterlagen hochzuladen und den Prüfstatus zu sehen. Kein Zugang zum internen CRM."
    >
      {searchParams.error ? <AuthAlert tone="error">{searchParams.error}</AuthAlert> : null}

      <form action={candidateLoginAction} className="flex flex-col gap-4">
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

      <p className="mt-4 text-sm">
        <Link
          href="/login/forgot-password?from=candidate"
          className="font-medium text-white/80 hover:text-white"
        >
          Passwort vergessen?
        </Link>
      </p>

      <p className="mt-5 text-sm text-white/50">
        Noch kein Konto?{" "}
        <Link href="/candidate/register" className="font-medium text-white hover:underline">
          Registrieren
        </Link>
      </p>

      {isDemoMode() ? (
        <p className="mt-4 text-xs text-white/40">
          Demo: {DEMO_CANDIDATE_LOGIN_HINT.email} / {DEMO_CANDIDATE_LOGIN_HINT.password}
        </p>
      ) : null}

      <p className="mt-6 text-xs text-white/35">
        Recruiter?{" "}
        <Link href="/login" className="text-white/70 hover:text-white">
          Interner Login
        </Link>
        {" · "}
        <Link href="/" className="text-white/70 hover:text-white">
          Startseite
        </Link>
      </p>
    </MarketingAuthShell>
  );
}
