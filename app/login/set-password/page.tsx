import Link from "next/link";
import { setPasswordAction } from "./actions";
import {
  AuthAlert,
  MarketingAuthShell,
  authButtonClass,
  authInputClass,
  authLabelClass,
  authLinkClass,
  authMutedClass,
} from "@/components/marketing/auth-shell";

export default function SetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string; error?: string };
}) {
  const token = searchParams.token?.trim() ?? "";

  return (
    <MarketingAuthShell
      audience="recruiter"
      kicker="Intern"
      title="Passwort festlegen"
      description="Lege ein eigenes Passwort für dein internes Konto fest."
    >
      {searchParams.error ? <AuthAlert tone="error">{searchParams.error}</AuthAlert> : null}

      {!token ? (
        <div className="flex flex-col gap-4">
          <p className={authMutedClass}>
            Dieser Link ist ungültig oder unvollständig. Bitte nutze den Link aus der Einladungs-E-Mail.
          </p>
          <Link href="/login" className={`text-sm ${authLinkClass}`}>
            Zur Anmeldung
          </Link>
        </div>
      ) : (
        <form action={setPasswordAction} className="flex flex-col gap-4">
          <input type="hidden" name="token" value={token} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className={authLabelClass}>
              Neues Passwort
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
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirm" className={authLabelClass}>
              Passwort bestätigen
            </label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={authInputClass}
            />
          </div>
          <button type="submit" className={authButtonClass}>
            Passwort speichern
          </button>
        </form>
      )}
    </MarketingAuthShell>
  );
}
