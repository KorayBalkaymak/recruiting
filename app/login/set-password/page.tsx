import Link from "next/link";
import { setPasswordAction } from "./actions";

export default function SetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string; error?: string };
}) {
  const token = searchParams.token?.trim() ?? "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-subtle px-4">
      <div className="w-full max-w-sm rounded-lg border border-surface-border bg-white p-8 shadow-panel">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-sm font-semibold text-white">
            CMS
          </div>
          <span className="text-sm font-medium text-ink">Recruiting-Plattform</span>
        </div>

        <h1 className="mb-1 text-lg font-semibold text-ink">Passwort festlegen</h1>
        <p className="mb-6 text-sm text-ink-muted">
          Lege ein eigenes Passwort für dein internes Konto fest.
        </p>

        {searchParams.error && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-status-danger">
            {searchParams.error}
          </p>
        )}

        {!token ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-muted">
              Dieser Link ist ungültig oder unvollständig. Bitte nutze den Link aus der Einladungs-E-Mail.
            </p>
            <Link href="/login" className="text-sm font-medium text-brand hover:underline">
              Zur Anmeldung
            </Link>
          </div>
        ) : (
          <form action={setPasswordAction} className="flex flex-col gap-4">
            <input type="hidden" name="token" value={token} />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-ink">
                Neues Passwort
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirm" className="text-sm font-medium text-ink">
                Passwort bestätigen
              </label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <button
              type="submit"
              className="mt-2 rounded-md bg-brand px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
            >
              Passwort speichern
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
