import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ActorAccessError,
  assertCandidateActor,
  assertCandidateOwnsResource,
  assertOfferReviewerActor,
  assertStaffActor,
  assertUserManagerActor,
  resolveBoundCandidateId,
  type CandidateActor,
  type StaffActor,
} from "./actor-binding.ts";

const staffRecruiter: StaffActor = {
  id: "s1",
  email: "r@example.com",
  fullName: "Recruiter",
  role: "recruiter",
};

const staffAdmin: StaffActor = {
  id: "s2",
  email: "a@example.com",
  fullName: "Admin",
  role: "admin",
};

const candidateA: CandidateActor = {
  accountId: "acc-a",
  candidateId: "cand-a",
  email: "a@example.com",
  fullName: "A Candidate",
  role: "candidate",
};

const candidateB: CandidateActor = {
  accountId: "acc-b",
  candidateId: "cand-b",
  email: "b@example.com",
  fullName: "B Candidate",
  role: "candidate",
};

describe("actor binding (BA4.3)", () => {
  it("rejects unauthenticated / malformed staff actors", () => {
    assert.throws(() => assertStaffActor(null), ActorAccessError);
    assert.throws(() => assertStaffActor(candidateA), ActorAccessError);
    assert.throws(() => assertStaffActor({ id: "x", role: "candidate" }), ActorAccessError);
    assert.equal(assertStaffActor(staffRecruiter).id, "s1");
  });

  it("rejects candidate access to foreign candidate IDs", () => {
    assert.throws(() => assertCandidateOwnsResource(candidateA, "cand-b"), ActorAccessError);
    assert.throws(() => assertCandidateOwnsResource(candidateA, ""), ActorAccessError);
    assert.doesNotThrow(() => assertCandidateOwnsResource(candidateA, "cand-a"));
  });

  it("resolveBoundCandidateId never trusts client override for candidates", () => {
    assert.equal(
      resolveBoundCandidateId({ type: "candidate", user: candidateA }, "cand-a"),
      "cand-a"
    );
    assert.throws(
      () => resolveBoundCandidateId({ type: "candidate", user: candidateA }, "cand-b"),
      ActorAccessError
    );
    assert.equal(
      resolveBoundCandidateId({ type: "staff", user: staffRecruiter }, "cand-b"),
      "cand-b"
    );
  });

  it("blocks candidate-shaped actors from staff CRM helpers", () => {
    assert.throws(() => assertStaffActor(candidateB), ActorAccessError);
    assert.throws(() => assertCandidateActor(staffRecruiter), ActorAccessError);
  });

  it("restricts admin/user-manager and offer-reviewer roles", () => {
    assert.throws(() => assertUserManagerActor(staffRecruiter), ActorAccessError);
    assert.equal(assertUserManagerActor(staffAdmin).role, "admin");
    assert.throws(() => assertOfferReviewerActor(staffRecruiter), ActorAccessError);
    assert.equal(assertOfferReviewerActor(staffAdmin).id, "s2");
    assert.equal(
      assertOfferReviewerActor({
        id: "k1",
        email: "k@example.com",
        fullName: "KAM",
        role: "kam",
      }).role,
      "kam"
    );
  });
});
