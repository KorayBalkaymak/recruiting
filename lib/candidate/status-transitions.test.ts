import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PortalProfileStatus } from "./portal-types.ts";
import {
  assertCandidateCanEditProfile,
  candidateEditResetsApproved,
  evaluateApprovedToDraftAttempt,
  evaluateReviewTransitionAttempt,
  isStaffTransitionAllowed,
  simulateConcurrentApprovedToDraft,
  simulateConcurrentReviews,
  STAFF_TRANSITIONS,
} from "./status-transitions.ts";

describe("portal review transitions (F-12)", () => {
  it("allows staff to start review from submitted", () => {
    assert.ok(isStaffTransitionAllowed("submitted", "in_review"));
    assert.ok(STAFF_TRANSITIONS.submitted.includes("in_review"));
  });

  it("does not allow approve from draft", () => {
    assert.equal(isStaffTransitionAllowed("draft", "approved"), false);
  });

  it("allows resolve outcomes only from in_review", () => {
    assert.deepEqual(STAFF_TRANSITIONS.in_review, [
      "changes_requested",
      "approved",
      "rejected",
    ]);
  });
});

describe("candidate edit rules (F-05)", () => {
  const locked: PortalProfileStatus[] = ["submitted", "in_review", "rejected"];
  const editable: PortalProfileStatus[] = ["draft", "changes_requested", "approved"];

  for (const status of editable) {
    it(`allows edit in ${status}`, () => {
      assert.doesNotThrow(() => assertCandidateCanEditProfile(status));
    });
  }

  for (const status of locked) {
    it(`blocks silent edit in ${status}`, () => {
      assert.throws(() => assertCandidateCanEditProfile(status), /nicht bearbeitet/);
    });
  }

  it("resets approved to draft on edit", () => {
    assert.equal(candidateEditResetsApproved("approved"), true);
    assert.equal(candidateEditResetsApproved("draft"), false);
  });
});

describe("review atomicity contract (F-07)", () => {
  it("accepts a successful transition with matched rows", () => {
    assert.deepEqual(
      evaluateReviewTransitionAttempt({
        fromStatus: "submitted",
        toStatus: "in_review",
        matchedRows: 1,
      }),
      { ok: true }
    );
  });

  it("rejects invalid transitions before write", () => {
    assert.deepEqual(
      evaluateReviewTransitionAttempt({
        fromStatus: "draft",
        toStatus: "approved",
        matchedRows: 1,
      }),
      { ok: false, reason: "invalid_transition" }
    );
  });

  it("treats zero matched rows as conflict", () => {
    assert.deepEqual(
      evaluateReviewTransitionAttempt({
        fromStatus: "in_review",
        toStatus: "approved",
        matchedRows: 0,
      }),
      { ok: false, reason: "conflict" }
    );
  });

  it("allows only one of two concurrent reviews to succeed", () => {
    const { finalStatus, results } = simulateConcurrentReviews({
      initialStatus: "in_review",
      firstTo: "approved",
      secondTo: "rejected",
    });
    assert.equal(finalStatus, "approved");
    assert.equal(results[0]?.ok, true);
    assert.equal(results[1]?.ok, false);
    assert.equal(results[1]?.reason, "conflict");
  });
});

describe("approved → draft atomicity contract (BA3.3 B)", () => {
  it("accepts successful approved→draft with event", () => {
    assert.deepEqual(
      evaluateApprovedToDraftAttempt({
        fromStatus: "approved",
        matchedRows: 1,
        eventInserted: true,
      }),
      { ok: true }
    );
  });

  it("rejects wrong from-status", () => {
    assert.deepEqual(
      evaluateApprovedToDraftAttempt({
        fromStatus: "submitted",
        matchedRows: 1,
        eventInserted: true,
      }),
      { ok: false, reason: "invalid_status" }
    );
  });

  it("rejects conflict (0 matched rows / lost race)", () => {
    assert.deepEqual(
      evaluateApprovedToDraftAttempt({
        fromStatus: "approved",
        matchedRows: 0,
        eventInserted: false,
      }),
      { ok: false, reason: "conflict" }
    );
  });

  it("rejects partial write (status without event)", () => {
    assert.deepEqual(
      evaluateApprovedToDraftAttempt({
        fromStatus: "approved",
        matchedRows: 1,
        eventInserted: false,
      }),
      { ok: false, reason: "partial_write" }
    );
  });

  it("allows only one concurrent approved→draft", () => {
    const { finalStatus, results } = simulateConcurrentApprovedToDraft();
    assert.equal(finalStatus, "draft");
    assert.equal(results[0]?.ok, true);
    assert.equal(results[1]?.ok, false);
    assert.equal(results[1]?.reason, "conflict");
  });
});
