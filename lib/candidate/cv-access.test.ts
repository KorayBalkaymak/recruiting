import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ActorAccessError } from "../auth/actor-binding.ts";
import { resolveBoundCandidateId } from "../auth/actor-binding.ts";
import type { CandidateActor, StaffActor } from "../auth/actor-binding.ts";

const candidateA: CandidateActor = {
  accountId: "acc-a",
  candidateId: "cand-a",
  email: "a@example.com",
  fullName: "A",
  role: "candidate",
};

const staff: StaffActor = {
  id: "s1",
  email: "s@example.com",
  fullName: "Staff",
  role: "recruiter",
};

describe("CV access actor binding (BA5)", () => {
  it("candidate cannot bind a foreign candidateId", () => {
    assert.throws(
      () => resolveBoundCandidateId({ type: "candidate", user: candidateA }, "cand-foreign"),
      ActorAccessError
    );
  });

  it("candidate self-id is accepted", () => {
    assert.equal(
      resolveBoundCandidateId({ type: "candidate", user: candidateA }, "cand-a"),
      "cand-a"
    );
  });

  it("staff may request a candidate id (authorization remains staff-gated upstream)", () => {
    assert.equal(
      resolveBoundCandidateId({ type: "staff", user: staff }, "cand-a"),
      "cand-a"
    );
  });

  it("rejects empty manipulated staff request ids", () => {
    assert.throws(
      () => resolveBoundCandidateId({ type: "staff", user: staff }, "   "),
      ActorAccessError
    );
  });
});
