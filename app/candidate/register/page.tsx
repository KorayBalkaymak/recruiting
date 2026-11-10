import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionCandidate, getSessionStaff } from "@/lib/auth";
import { candidateRegisterAction } from "../actions";

export default async function CandidateRegisterPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const staff = await getSessionStaff();
  if (staff) redirect("/");
  const candidate = await getSessionCandidate();
  if (candidate) redirect("/candidate/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-subtle px-4">
      <div className="w-full max-w-sm rounded-lg border border-surface-border bg-white p-8 shadow-panel">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-sm font-semibold text-white">
            CMS
          </div>
          <span className="text-sm font-medium text-ink">Kandidatenportal</span>
        </div>
        <h1 className="mb-1 text-lg font-semibold text-ink">Konto erstellen</h1>
        <p className="mb-6 text-sm text-ink-muted">
          Registriere dich, um dein Profil anzulegen und zur Prüfung einzureichen.
        </p>

        {searchParams.error && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-status-danger">
            {searchParams.error}
          </p>
        )}

        <form action={candidateRegisterAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="fullName" className="text-sm font-medium text-ink">
              Vollständiger Name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              className="rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-ink">
              E-Mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-ink">
              Passwort
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              className="rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <button
            type="submit"
            className="mt-2 rounded-md bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover"
          >
            Registrieren
          </button>
        </form>

        <p className="mt-5 text-sm text-ink-muted">
          Bereits registriert?{" "}
          <Link href="/candidate/login" className="font-medium text-brand hover:underline">
            Anmelden
          </Link>
        </p>
      </div>
    </div>
  );
}
