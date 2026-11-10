import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createDemoCandidateSessionToken,
  resolveDemoSessionSecret,
  verifyDemoCandidateSessionToken,
} from "./session-crypto.ts";

const SECRET = "a".repeat(32);
const ACCOUNT = "cacc1111-0000-0000-0000-000000000001";

describe("demo candidate session token (legacy path)", () => {
  it("still works via session-crypto exports", async () => {
    const token = await createDemoCandidateSessionToken(ACCOUNT, { secret: SECRET });
    const payload = await verifyDemoCandidateSessionToken(token, { secret: SECRET });
    assert.ok(payload);
    assert.equal(payload.accountId, ACCOUNT);
    assert.equal(resolveDemoSessionSecret({ DEMO_SESSION_SECRET: SECRET }), SECRET);
  });
});
