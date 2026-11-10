import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Opaque one-time tokens with TTL.
 * Stores only a SHA-256 hash of the raw token — never persist the raw value.
 * Better Auth reset tokens remain authoritative for password reset; this helper
 * covers app-owned flows and unit-tests the security contract.
 */

export type SecureTokenRecord = {
  id: string;
  purpose: string;
  tokenHash: string;
  expiresAt: number;
  consumedAt: number | null;
  meta?: Record<string, string>;
};

export type SecureTokenStore = {
  put(record: SecureTokenRecord): void;
  get(id: string): SecureTokenRecord | undefined;
  update(record: SecureTokenRecord): void;
};

export function createMemorySecureTokenStore(): SecureTokenStore {
  const map = new Map<string, SecureTokenRecord>();
  return {
    put(record) {
      map.set(record.id, { ...record });
    },
    get(id) {
      const found = map.get(id);
      return found ? { ...found } : undefined;
    },
    update(record) {
      map.set(record.id, { ...record });
    },
  };
}

export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export function generateRawToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

function hashesEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export type IssueTokenResult = {
  id: string;
  rawToken: string;
  expiresAt: number;
};

export function issueSecureToken(
  store: SecureTokenStore,
  input: {
    purpose: string;
    ttlSeconds: number;
    now?: number;
    meta?: Record<string, string>;
  }
): IssueTokenResult {
  if (input.ttlSeconds <= 0) {
    throw new Error("Token-TTL muss positiv sein.");
  }
  const now = input.now ?? Date.now();
  const id = randomBytes(16).toString("hex");
  const rawToken = generateRawToken();
  const expiresAt = now + input.ttlSeconds * 1000;
  store.put({
    id,
    purpose: input.purpose,
    tokenHash: hashToken(rawToken),
    expiresAt,
    consumedAt: null,
    meta: input.meta,
  });
  return { id, rawToken, expiresAt };
}

export type ConsumeTokenResult =
  | { ok: true; record: SecureTokenRecord }
  | {
      ok: false;
      reason: "not_found" | "purpose_mismatch" | "expired" | "already_used" | "invalid";
    };

export function consumeSecureToken(
  store: SecureTokenStore,
  input: {
    id: string;
    rawToken: string;
    purpose: string;
    now?: number;
  }
): ConsumeTokenResult {
  const now = input.now ?? Date.now();
  const record = store.get(input.id);
  if (!record) return { ok: false, reason: "not_found" };
  if (record.purpose !== input.purpose) return { ok: false, reason: "purpose_mismatch" };
  if (record.consumedAt != null) return { ok: false, reason: "already_used" };
  if (record.expiresAt <= now) return { ok: false, reason: "expired" };
  if (!hashesEqual(record.tokenHash, hashToken(input.rawToken))) {
    return { ok: false, reason: "invalid" };
  }

  const consumed: SecureTokenRecord = { ...record, consumedAt: now };
  store.update(consumed);
  return { ok: true, record: consumed };
}

/** Default TTL for password-setup / reset links (matches Better Auth default). */
export const PASSWORD_TOKEN_TTL_SECONDS = 60 * 60;
