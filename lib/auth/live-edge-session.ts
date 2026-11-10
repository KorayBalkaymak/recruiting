import { getCookieCache, getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { principalFromRole, type PrincipalKind } from "./route-policy";

type SessionPayload = {
  user?: { role?: unknown } | null;
} | null;

/**
 * Resolves live principal for Edge middleware.
 * 1) Signed Better Auth cookie cache (includes role) when present.
 * 2) Otherwise validates via Better Auth get-session (DB-backed) using the request cookies.
 * Cookie presence alone never grants access.
 */
export async function resolveLivePrincipal(request: NextRequest): Promise<PrincipalKind> {
  const token = getSessionCookie(request);
  if (!token) return "anonymous";

  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    // Misconfigured live auth → fail closed.
    return "anonymous";
  }

  try {
    const cached = await getCookieCache(request, { secret });
    const fromCache = principalFromRole(cached?.user?.role);
    if (fromCache) return fromCache;
  } catch {
    // Fall through to authoritative get-session.
  }

  try {
    const url = new URL("/api/auth/get-session", request.nextUrl.origin);
    const res = await fetch(url, {
      method: "GET",
      headers: {
        cookie: request.headers.get("cookie") ?? "",
        accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) return "anonymous";
    const data = (await res.json()) as SessionPayload;
    return principalFromRole(data?.user?.role) ?? "anonymous";
  } catch {
    return "anonymous";
  }
}
