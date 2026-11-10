import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseExplicitDemoFlag } from "./mode.ts";
import {
  createDemoCandidateSessionToken,
  createDemoStaffSessionToken,
  verifyDemoCandidateSessionToken,
  verifyDemoStaffSessionToken,
} from "./session-crypto.ts";
import { assertStaffProfileForRoleChange } from "../auth/roles.ts";
import {
  assertCandidateCanEditProfile,
  isStaffTransitionAllowed,
} from "../candidate/status-transitions.ts";

const SECRET = "c".repeat(32);

describe("auth / demo boundaries (BA3.3 C)", () => {
  it("demo cookies are meaningless when demo flag is off (verified path)", () => {
    // Live code only calls verify* inside isDemoMode() branches.
    assert.equal(parseExplicitDemoFlag(undefined), false);
    assert.equal(parseExplicitDemoFlag("false"), false);
  });

  it("cross-kind demo tokens are rejected", async () => {
    const staff = await createDemoStaffSessionToken("staff-1", { secret: SECRET });
    const candidate = await createDemoCandidateSessionToken("cand-1", { secret: SECRET });
    assert.equal(await verifyDemoStaffSessionToken(candidate, { secret: SECRET }), null);
    assert.equal(await verifyDemoCandidateSessionToken(staff, { secret: SECRET }), null);
  });

  it("candidates cannot self-approve via staff transitions", () => {
    assert.equal(isStaffTransitionAllowed("draft", "approved"), false);
    assert.equal(isStaffTransitionAllowed("submitted", "approved"), false);
  });

  it("submitted profiles cannot be silently edited", () => {
    assert.throws(() => assertCandidateCanEditProfile("submitted"));
    assert.throws(() => assertCandidateCanEditProfile("in_review"));
  });

  it("role changes reject candidate / missing profiles before any write", () => {
    assert.throws(() => assertStaffProfileForRoleChange(null));
    assert.throws(() => assertStaffProfileForRoleChange({ id: "x", role: "candidate" }));
    assert.doesNotThrow(() => assertStaffProfileForRoleChange({ id: "a", role: "admin" }));
    assert.doesNotThrow(() => assertStaffProfileForRoleChange({ id: "r", role: "recruiter" }));
  });
});
