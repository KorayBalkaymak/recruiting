export const DEMO_COOKIE = "cms-demo-user";
export const DEMO_CANDIDATE_COOKIE = "cms-demo-candidate";

/**
 * Demo mode is fail-closed: only an explicit, valid flag enables it.
 * Missing/placeholder Supabase config must NEVER silently enable demo auth.
 *
 * Demo:  NEXT_PUBLIC_DEMO_MODE=true
 * Live:  NEXT_PUBLIC_DEMO_MODE unset/false + DATABASE_URL + Better Auth env
 */
export function isDemoMode(): boolean {
  return parseExplicitDemoFlag(process.env.NEXT_PUBLIC_DEMO_MODE);
}

/** Pure helper for tests — does not read process.env. */
export function parseExplicitDemoFlag(value: string | undefined | null): boolean {
  if (value == null) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

/**
 * Live auth must not fall back to demo. Call when entering live-only paths
 * if you need a clear misconfiguration error (optional helper for callers).
 *
 * Full DATABASE_URL validation (incl. quote-stripping) happens in getDb().
 */
export function assertLiveAuthConfigured(): void {
  if (isDemoMode()) {
    throw new Error("Live-Auth ist im Demo-Modus nicht verfügbar.");
  }
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL muss für den Live-Betrieb gesetzt sein.");
  }
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET fehlt oder ist zu kurz (mind. 32 Zeichen).");
  }
  const baseURL = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (!baseURL) {
    throw new Error("BETTER_AUTH_URL oder NEXT_PUBLIC_APP_URL muss gesetzt sein.");
  }
}
