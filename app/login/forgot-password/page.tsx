import Link from "next/link";
import { requestPasswordResetAction } from "./actions";
import {
  AuthAlert,
  MarketingAuthShell,
  authButtonClass,
  authInputClass,
  authLabelClass,
  authLinkClass,
} from "@/components/marketing/auth-shell";

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: { error?: string; message?: string; from?: string };
}) {
  const fromCandidate = searchParams.from === "candidate";
  const backHref = fromCandidate ? "/candidate/login" : "/login";
  const backLabel = fromCandidate ? "Zurück zur Kandidaten-Anmeldung" : "Zurück zur Anmeldung";

  return (
    <MarketingAuthShell
      audience={fromCandidate ? "candidate" : "recruiter"}
      kicker={fromCandidate ? "Portal" : "Intern"}
      title="Passwort zurücksetzen"
      description="Gib deine E-Mail-Adresse ein. Falls ein Konto existiert, senden wir einen Link zum Zurücksetzen."
    >
      {searchParams.message ? <AuthAlert tone="ok">{searchParams.message}</AuthAlert> : null}
      {searchParams.error ? <AuthAlert tone="error">{searchParams.error}</AuthAlert> : null}

      <form action={requestPasswordResetAction} className="flex flex-col gap-4">
        {fromCandidate ? <input type="hidden" name="from" value="candidate" /> : null}
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
        <button type="submit" className={authButtonClass}>
          Link anfordern
        </button>
      </form>

      <p className="mt-5 text-sm">
        <Link href={backHref} className={`text-sm ${authLinkClass}`}>
          {backLabel}
        </Link>
      </p>
    </MarketingAuthShell>
  );
}
