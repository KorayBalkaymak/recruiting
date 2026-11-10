import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createDemoCandidateSessionToken,
  createDemoStaffSessionToken,
  resolveDemoSessionSecret,
  verifyDemoCandidateSessionToken,
  verifyDemoStaffSessionToken,
} from "./session-crypto.ts";

const SECRET = "a".repeat(32);
const STAFF_ID = "11111111-1111-1111-1111-111111111111";
const CANDIDATE_ID = "cacc1111-0000-0000-0000-000000000001";

describe("demo staff session token (BA3.3 A)", () => {
  it("accepts a valid signed staff token", async () => {
    const token = await createDemoStaffSessionToken(STAFF_ID, { secret: SECRET });
    const payload = await verifyDemoStaffSessionToken(token, { secret: SECRET });
    assert.ok(payload);
    assert.equal(payload.userId, STAFF_ID);
  });

  it("rejects a manipulated staff token", async () => {
    const token = await createDemoStaffSessionToken(STAFF_ID, { secret: SECRET });
    const [body] = token.split(".");
    const tampered = `${body}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`;
    assert.equal(await verifyDemoStaffSessionToken(tampered, { secret: SECRET }), null);
  });

  it("rejects a raw UUID as staff auth", async () => {
    assert.equal(await verifyDemoStaffSessionToken(STAFF_ID, { secret: SECRET }), null);
  });

  it("rejects expired staff tokens", async () => {
    const now = Date.now();
    const token = await createDemoStaffSessionToken(STAFF_ID, {
      secret: SECRET,
      nowMs: now - 60_000,
      ttlSeconds: 1,
    });
    assert.equal(
      await verifyDemoStaffSessionToken(token, { secret: SECRET, nowMs: now + 5_000 }),
      null
    );
  });

  it("rejects when secret is missing", async () => {
    await assert.rejects(
      () => createDemoStaffSessionToken(STAFF_ID, { secret: null }),
      /DEMO_SESSION_SECRET|BETTER_AUTH_SECRET/
    );
    const token = await createDemoStaffSessionToken(STAFF_ID, { secret: SECRET });
    assert.equal(await verifyDemoStaffSessionToken(token, { secret: null }), null);
  });
});

describe("demo candidate session token (BA3.3 A / F-02)", () => {
  it("accepts a valid signed candidate token", async () => {
    const token = await createDemoCandidateSessionToken(CANDIDATE_ID, { secret: SECRET });
    const payload = await verifyDemoCandidateSessionToken(token, { secret: SECRET });
    assert.ok(payload);
    assert.equal(payload.accountId, CANDIDATE_ID);
  });

  it("rejects raw UUID / bad signature / expiry / missing secret", async () => {
    assert.equal(await verifyDemoCandidateSessionToken(CANDIDATE_ID, { secret: SECRET }), null);
    const token = await createDemoCandidateSessionToken(CANDIDATE_ID, { secret: SECRET });
    const [body] = token.split(".");
    assert.equal(
      await verifyDemoCandidateSessionToken(`${body}.bad`, { secret: SECRET }),
      null
    );
    const expired = await createDemoCandidateSessionToken(CANDIDATE_ID, {
      secret: SECRET,
      nowMs: Date.now() - 120_000,
      ttlSeconds: 1,
    });
    assert.equal(await verifyDemoCandidateSessionToken(expired, { secret: SECRET }), null);
    assert.equal(await verifyDemoCandidateSessionToken(token, { secret: null }), null);
  });

  it("resolveDemoSessionSecret requires >= 32 chars", () => {
    assert.equal(resolveDemoSessionSecret({ DEMO_SESSION_SECRET: "short" }), null);
    assert.equal(resolveDemoSessionSecret({ DEMO_SESSION_SECRET: SECRET }), SECRET);
  });
});

describe("demo session kind isolation (BA3.3 A/C)", () => {
  it("rejects candidate token in staff verify", async () => {
    const candidateToken = await createDemoCandidateSessionToken(CANDIDATE_ID, {
      secret: SECRET,
    });
    assert.equal(await verifyDemoStaffSessionToken(candidateToken, { secret: SECRET }), null);
  });

  it("rejects staff token in candidate verify", async () => {
    const staffToken = await createDemoStaffSessionToken(STAFF_ID, { secret: SECRET });
    assert.equal(await verifyDemoCandidateSessionToken(staffToken, { secret: SECRET }), null);
  });
});
