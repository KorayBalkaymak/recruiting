import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function login(formData: FormData) {
  "use server";

  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const supabase = createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/");
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-subtle px-4">
      <div className="w-full max-w-sm rounded-lg border border-surface-border bg-white p-8 shadow-panel">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-sm font-semibold text-white">
            CMS
          </div>
          <span className="text-sm font-medium text-ink">Recruiting-Plattform</span>
        </div>

        <h1 className="mb-1 text-lg font-semibold text-ink">Anmelden</h1>
        <p className="mb-6 text-sm text-ink-muted">
          Melde dich mit deinem internen Konto an.
        </p>

        {searchParams.error && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-status-danger">
            {searchParams.error}
          </p>
        )}

        <form action={login} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-ink">
              E-Mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="max.kam@cms-platform.de"
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
              className="rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <button
            type="submit"
            className="mt-2 rounded-md bg-brand px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
          >
            Anmelden
          </button>
        </form>

        <p className="mt-5 text-xs leading-relaxed text-ink-muted">
          Demo: <span className="font-medium text-ink">anna.recruiter@cms-platform.de</span> /
          Passwort <span className="font-medium text-ink">demo1234</span>
        </p>
      </div>
    </div>
  );
}
