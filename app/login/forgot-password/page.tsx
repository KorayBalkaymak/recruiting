import Link from "next/link";
import { requestPasswordResetAction } from "./actions";

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: { error?: string; message?: string; from?: string };
}) {
  const fromCandidate = searchParams.from === "candidate";
  const backHref = fromCandidate ? "/candidate/login" : "/login";
  const backLabel = fromCandidate ? "Zurück zur Kandidaten-Anmeldung" : "Zurück zur Anmeldung";

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-subtle px-4">
      <div className="w-full max-w-sm rounded-lg border border-surface-border bg-white p-8 shadow-panel">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-sm font-semibold text-white">
            CMS
          </div>
          <span className="text-sm font-medium text-ink">
            {fromCandidate ? "Kandidatenportal" : "Recruiting-Plattform"}
          </span>
        </div>

        <h1 className="mb-1 text-lg font-semibold text-ink">Passwort zurücksetzen</h1>
        <p className="mb-6 text-sm text-ink-muted">
          Gib deine E-Mail-Adresse ein. Falls ein Konto existiert, senden wir einen Link zum
          Zurücksetzen.
        </p>

        {searchParams.message && (
          <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-status-done">
            {searchParams.message}
          </p>
        )}

        {searchParams.error && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-status-danger">
            {searchParams.error}
          </p>
        )}

        <form action={requestPasswordResetAction} className="flex flex-col gap-4">
          {fromCandidate ? <input type="hidden" name="from" value="candidate" /> : null}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-ink">
              E-Mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <button
            type="submit"
            className="mt-2 rounded-md bg-brand px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
          >
            Link anfordern
          </button>
        </form>

        <p className="mt-5 text-sm">
          <Link href={backHref} className="font-medium text-brand hover:underline">
            {backLabel}
          </Link>
        </p>
      </div>
    </div>
  );
}
