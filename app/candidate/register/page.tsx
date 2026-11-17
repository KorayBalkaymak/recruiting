import Link from "next/link";
import { redirect } from "next/navigation";
import { peekCandidateSession, peekStaffSession } from "@/lib/auth/public-session";
import { candidateRegisterAction } from "../actions";
import {
  AuthAlert,
  MarketingAuthShell,
  authButtonClass,
  authFineClass,
  authInputClass,
  authLabelClass,
  authLinkClass,
  authMutedClass,
} from "@/components/marketing/auth-shell";

export default async function CandidateRegisterPage({
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
      title="Als Talent registrieren"
      description="Lege dein Konto an, vervollständige dein Profil und reiche es zur internen Prüfung ein."
    >
      {searchParams.error ? <AuthAlert tone="error">{searchParams.error}</AuthAlert> : null}

      <form action={candidateRegisterAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fullName" className={authLabelClass}>
            Vollständiger Name
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            autoComplete="name"
            className={authInputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className={authLabelClass}>
            E-Mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
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
            minLength={8}
            autoComplete="new-password"
            className={authInputClass}
          />
          <p className={authFineClass}>Mindestens 8 Zeichen.</p>
        </div>
        <button type="submit" className={authButtonClass}>
          Registrieren
        </button>
      </form>

      <p className={`mt-5 ${authMutedClass}`}>
        Bereits registriert?{" "}
        <Link href="/candidate/login" className={authLinkClass}>
          Anmelden
        </Link>
      </p>
      <p className={`mt-4 ${authFineClass}`}>
        <Link href="/" className={authLinkClass}>
          Zur Startseite
        </Link>
      </p>
    </MarketingAuthShell>
  );
}
