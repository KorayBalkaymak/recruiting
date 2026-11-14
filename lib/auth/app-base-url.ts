/**
 * Accepts full URLs, quoted values, or bare hosts (Vercel UI often stores
 * `my-app.vercel.app` / `VERCEL_URL` without a scheme).
 */
export function normalizeAppBaseUrl(raw: string): string {
  let value = raw.replace(/^\uFEFF/, "").trim();
  for (let i = 0; i < 2; i++) {
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith("\u201C") && value.endsWith("\u201D"))
    ) {
      value = value.slice(1, -1).trim();
    }
  }
  if (!value) {
    throw new Error("BETTER_AUTH_URL/NEXT_PUBLIC_APP_URL ist leer.");
  }
  if (!/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    value = `https://${value.replace(/^\/+/, "")}`;
  }
  if (!/^https?:\/\//i.test(value)) {
    throw new Error(
      "BETTER_AUTH_URL/NEXT_PUBLIC_APP_URL muss http(s) nutzen (z.B. https://dein-projekt.vercel.app)."
    );
  }
  try {
    return new URL(value).origin;
  } catch {
    throw new Error("BETTER_AUTH_URL/NEXT_PUBLIC_APP_URL ist keine gültige URL.");
  }
}

function tryOrigin(raw: string | undefined | null): string | null {
  if (!raw?.trim()) return null;
  try {
    return normalizeAppBaseUrl(raw);
  } catch {
    return null;
  }
}

export function isLoopbackOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
  } catch {
    return false;
  }
}

/**
 * Live URL for Better Auth cookies/CSRF.
 * On Vercel, skip localhost values copied from .env.example.
 */
export function resolveAuthBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const onVercel = env.VERCEL === "1" || env.VERCEL === "true";
  const candidates = [
    env.BETTER_AUTH_URL,
    env.NEXT_PUBLIC_APP_URL,
    env.VERCEL_PROJECT_PRODUCTION_URL,
    env.VERCEL_BRANCH_URL,
    env.VERCEL_URL ? `https://${env.VERCEL_URL.replace(/^https?:\/\//, "")}` : undefined,
  ];
  for (const raw of candidates) {
    const origin = tryOrigin(raw);
    if (!origin) continue;
    if (onVercel && isLoopbackOrigin(origin)) continue;
    return origin;
  }
  throw new Error(
    onVercel
      ? "BETTER_AUTH_URL zeigt auf localhost. Setze die Live-URL (https://dein-projekt.vercel.app) oder lasse VERCEL_URL greifen."
      : "BETTER_AUTH_URL oder NEXT_PUBLIC_APP_URL muss gesetzt sein."
  );
}

/** Origins Better Auth may accept for CSRF/cookies (Vercel preview + production). */
export function collectAuthTrustedOrigins(
  env: NodeJS.ProcessEnv = process.env
): string[] {
  const onVercel = env.VERCEL === "1" || env.VERCEL === "true";
  const origins = new Set<string>();
  for (const raw of [
    env.BETTER_AUTH_URL,
    env.NEXT_PUBLIC_APP_URL,
    env.VERCEL_URL,
    env.VERCEL_PROJECT_PRODUCTION_URL,
    env.VERCEL_BRANCH_URL,
  ]) {
    const origin = tryOrigin(raw);
    if (!origin) continue;
    if (onVercel && isLoopbackOrigin(origin)) continue;
    origins.add(origin);
  }
  if (!onVercel) {
    for (const origin of [
      "http://localhost:3000",
      "http://localhost:3002",
      "http://localhost:3003",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3002",
      "http://127.0.0.1:3003",
    ]) {
      origins.add(origin);
    }
  }
  return [...origins];
}
