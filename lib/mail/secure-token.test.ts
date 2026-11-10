import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PASSWORD_TOKEN_TTL_SECONDS,
  consumeSecureToken,
  createMemorySecureTokenStore,
  hashToken,
  issueSecureToken,
} from "./secure-token.ts";

describe("secure tokens (BA5.1)", () => {
  it("issues a hashed token with TTL and never stores the raw value", () => {
    const store = createMemorySecureTokenStore();
    const issued = issueSecureToken(store, {
      purpose: "password_reset",
      ttlSeconds: PASSWORD_TOKEN_TTL_SECONDS,
      now: 1_000_000,
    });

    const record = store.get(issued.id);
    assert.ok(record);
    assert.equal(record.tokenHash, hashToken(issued.rawToken));
    assert.notEqual(record.tokenHash, issued.rawToken);
    assert.equal(record.expiresAt, 1_000_000 + PASSWORD_TOKEN_TTL_SECONDS * 1000);
    assert.equal(record.consumedAt, null);
  });

  it("consumes a valid token exactly once", () => {
    const store = createMemorySecureTokenStore();
    const issued = issueSecureToken(store, {
      purpose: "staff_invite",
      ttlSeconds: 60,
      now: 0,
    });

    const first = consumeSecureToken(store, {
      id: issued.id,
      rawToken: issued.rawToken,
      purpose: "staff_invite",
      now: 10,
    });
    assert.equal(first.ok, true);

    const second = consumeSecureToken(store, {
      id: issued.id,
      rawToken: issued.rawToken,
      purpose: "staff_invite",
      now: 20,
    });
    assert.deepEqual(second, { ok: false, reason: "already_used" });
  });

  it("rejects expired tokens", () => {
    const store = createMemorySecureTokenStore();
    const issued = issueSecureToken(store, {
      purpose: "password_reset",
      ttlSeconds: 60,
      now: 0,
    });

    const result = consumeSecureToken(store, {
      id: issued.id,
      rawToken: issued.rawToken,
      purpose: "password_reset",
      now: 60_001,
    });
    assert.deepEqual(result, { ok: false, reason: "expired" });
  });

  it("rejects wrong purpose, missing id, and invalid raw token", () => {
    const store = createMemorySecureTokenStore();
    const issued = issueSecureToken(store, {
      purpose: "password_reset",
      ttlSeconds: 60,
      now: 0,
    });

    assert.deepEqual(
      consumeSecureToken(store, {
        id: issued.id,
        rawToken: issued.rawToken,
        purpose: "staff_invite",
        now: 1,
      }),
      { ok: false, reason: "purpose_mismatch" }
    );

    assert.deepEqual(
      consumeSecureToken(store, {
        id: "missing",
        rawToken: issued.rawToken,
        purpose: "password_reset",
        now: 1,
      }),
      { ok: false, reason: "not_found" }
    );

    assert.deepEqual(
      consumeSecureToken(store, {
        id: issued.id,
        rawToken: "tampered-token",
        purpose: "password_reset",
        now: 1,
      }),
      { ok: false, reason: "invalid" }
    );
  });
});
