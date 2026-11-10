import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo/mode";
import { getAuth } from "@/lib/auth";
import {
  RATE_LIMITS,
  clientIpFromHeaders,
  enforceRateLimit,
  rateLimitKey,
} from "@/lib/security/rate-limit";

function demoAuthUnavailable() {
  return NextResponse.json(
    { error: "Better Auth ist im Demo-Modus nicht aktiv." },
    { status: 503 }
  );
}

/** Paths that accept unauthenticated abuse (credential stuffing / reset spam). */
function isSensitiveAuthPath(pathname: string): boolean {
  return (
    pathname.includes("/sign-in") ||
    pathname.includes("/sign-up") ||
    pathname.includes("/forget-password") ||
    pathname.includes("/request-password-reset") ||
    pathname.includes("/reset-password")
  );
}

async function enforceAuthRateLimit(request: Request): Promise<NextResponse | null> {
  if (!isSensitiveAuthPath(new URL(request.url).pathname)) return null;
  const ip = clientIpFromHeaders(request.headers);
  const result = await enforceRateLimit(
    rateLimitKey({ action: "auth_api", ip }),
    RATE_LIMITS.authApi
  );
  if (result.ok) return null;
  return NextResponse.json(
    { error: "Zu viele Anfragen. Bitte später erneut versuchen." },
    {
      status: 429,
      headers: { "Retry-After": String(result.retryAfterSeconds) },
    }
  );
}

export async function GET(request: Request) {
  if (isDemoMode()) return demoAuthUnavailable();
  const limited = await enforceAuthRateLimit(request);
  if (limited) return limited;
  return getAuth().handler(request);
}

export async function POST(request: Request) {
  if (isDemoMode()) return demoAuthUnavailable();
  const limited = await enforceAuthRateLimit(request);
  if (limited) return limited;
  return getAuth().handler(request);
}
