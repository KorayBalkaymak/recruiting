/**
 * Shared HMAC helpers for demo sessions (Edge + Node via Web Crypto).
 * Live Better Auth tokens are never issued or verified here.
 *
 * Staff and candidate tokens share the signing scheme but carry a distinct `kind`
 * so they cannot be accepted interchangeably.
 */

const encoder = new TextEncoder();

export const DEMO_SESSION_TTL_SECONDS = 60 * 60 * 12; // 12h
export const DEMO_CANDIDATE_SESSION_TTL_SECONDS = DEMO_SESSION_TTL_SECONDS;
export const DEMO_STAFF_SESSION_TTL_SECONDS = DEMO_SESSION_TTL_SECONDS;

export type DemoSessionKind = "staff" | "candidate";

export function resolveDemoSessionSecret(
  env: NodeJS.ProcessEnv = process.env
): string | null {
  const dedicated = env.DEMO_SESSION_SECRET?.trim();
  if (dedicated && dedicated.length >= 32) return dedicated;
  const fallback = env.BETTER_AUTH_SECRET?.trim();
  if (fallback && fallback.length >= 32) return fallback;
  return null;
}

function base64UrlEncode(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacSign(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return base64UrlEncode(sig);
}

export type SignedDemoPayload = {
  kind: DemoSessionKind;
  subjectId: string;
  exp: number;
};

export type TokenOptions = {
  nowMs?: number;
  ttlSeconds?: number;
  secret?: string | null;
};

export async function createSignedDemoToken(
  kind: DemoSessionKind,
  subjectId: string,
  options?: TokenOptions
): Promise<string> {
  const secret = options?.secret === undefined ? resolveDemoSessionSecret() : options.secret;
  if (!secret) {
    throw new Error(
      "DEMO_SESSION_SECRET oder BETTER_AUTH_SECRET (mind. 32 Zeichen) ist für Demo-Sessions erforderlich."
    );
  }
  if (!subjectId.trim()) {
    throw new Error("Ungültige Demo-Subject-ID.");
  }

  const nowMs = options?.nowMs ?? Date.now();
  const ttl = options?.ttlSeconds ?? DEMO_SESSION_TTL_SECONDS;
  const payload: SignedDemoPayload = {
    kind,
    subjectId,
    exp: Math.floor(nowMs / 1000) + ttl,
  };
  const body = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const sig = await hmacSign(secret, body);
  return `${body}.${sig}`;
}

export async function verifySignedDemoToken(
  expectedKind: DemoSessionKind,
  token: string | undefined | null,
  options?: TokenOptions
): Promise<SignedDemoPayload | null> {
  if (!token) return null;
  const secret = options?.secret === undefined ? resolveDemoSessionSecret() : options.secret;
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!body || !sig) return null;

  const expected = await hmacSign(secret, body);
  if (!timingSafeEqual(sig, expected)) return null;

  let payload: SignedDemoPayload;
  try {
    const json = new TextDecoder().decode(base64UrlDecode(body));
    payload = JSON.parse(json) as SignedDemoPayload;
  } catch {
    return null;
  }

  if (payload.kind !== expectedKind) return null;
  if (typeof payload.subjectId !== "string" || !payload.subjectId.trim()) return null;
  if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) return null;

  const nowSec = Math.floor((options?.nowMs ?? Date.now()) / 1000);
  if (payload.exp <= nowSec) return null;

  return payload;
}

export function demoSessionCookieOptions(maxAgeSeconds = DEMO_SESSION_TTL_SECONDS) {
  return {
    httpOnly: true as const,
    path: "/" as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: maxAgeSeconds,
  };
}

export const demoCandidateCookieOptions = demoSessionCookieOptions;
export const demoStaffCookieOptions = demoSessionCookieOptions;

export type DemoCandidateSessionPayload = { accountId: string; exp: number };
export type DemoStaffSessionPayload = { userId: string; exp: number };

export async function createDemoCandidateSessionToken(
  accountId: string,
  options?: TokenOptions
) {
  return createSignedDemoToken("candidate", accountId, options);
}

export async function verifyDemoCandidateSessionToken(
  token: string | undefined | null,
  options?: TokenOptions
): Promise<DemoCandidateSessionPayload | null> {
  const payload = await verifySignedDemoToken("candidate", token, options);
  if (!payload) return null;
  return { accountId: payload.subjectId, exp: payload.exp };
}

export async function createDemoStaffSessionToken(userId: string, options?: TokenOptions) {
  return createSignedDemoToken("staff", userId, options);
}

export async function verifyDemoStaffSessionToken(
  token: string | undefined | null,
  options?: TokenOptions
): Promise<DemoStaffSessionPayload | null> {
  const payload = await verifySignedDemoToken("staff", token, options);
  if (!payload) return null;
  return { userId: payload.subjectId, exp: payload.exp };
}
