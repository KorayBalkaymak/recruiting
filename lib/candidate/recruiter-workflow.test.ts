import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  claimLiveLabel,
  claimStatusLabel,
  evaluateClaimAttempt,
  evaluateConcurrentClaims,
  evaluateReleaseAttempt,
  hasRequiredApplicationDocument,
  isRegisteredWithoutUploads,
  recruiterInactivity,
} from "./recruiter-workflow.ts";

describe("registered candidates without uploads", () => {
  it("includes registered accounts without a CV", () => {
    assert.equal(
      isRegisteredWithoutUploads({ hasAccount: true, originalCvCount: 0, cvFilePath: null }),
      true
    );
  });

  it("excludes staff-created candidates without a portal account", () => {
    assert.equal(
      isRegisteredWithoutUploads({ hasAccount: false, originalCvCount: 0, cvFilePath: null }),
      false
    );
  });

  it("excludes registered candidates after a CV upload", () => {
    assert.equal(
      isRegisteredWithoutUploads({ hasAccount: true, originalCvCount: 1, cvFilePath: null }),
      false
    );
    assert.equal(
      isRegisteredWithoutUploads({
        hasAccount: true,
        originalCvCount: 0,
        cvFilePath: "candidates/cv.pdf",
      }),
      false
    );
  });

  it("does not treat an incomplete profile as missing documents", () => {
    assert.equal(hasRequiredApplicationDocument({ originalCvCount: 1, cvFilePath: null }), true);
    assert.equal(
      isRegisteredWithoutUploads({ hasAccount: true, originalCvCount: 1, cvFilePath: null }),
      false
    );
  });
});

describe("recruiter inactivity warning", () => {
  const now = new Date("2026-11-19T12:00:00.000Z");

  it("flags candidates without a recruiter action timestamp", () => {
    const warning = recruiterInactivity(null, now);
    assert.equal(warning.stale, true);
    assert.equal(warning.label, "Noch nicht bearbeitet");
  });

  it("stays quiet within three days of a recruiter action", () => {
    const warning = recruiterInactivity("2026-11-17T12:00:00.000Z", now);
    assert.equal(warning.stale, false);
    assert.equal(warning.label, null);
  });

  it("warns at three days and updates the copy afterwards", () => {
    const atThree = recruiterInactivity("2026-11-16T12:00:00.000Z", now);
    assert.equal(atThree.stale, true);
    assert.equal(atThree.days, 3);
    assert.equal(atThree.label, "Seit 3 Tagen nicht bearbeitet");

    const atFive = recruiterInactivity("2026-11-14T12:00:00.000Z", now);
    assert.equal(atFive.stale, true);
    assert.equal(atFive.days, 5);
    assert.equal(atFive.label, "Seit 5 Tagen nicht bearbeitet");
  });

  it("clears after a fresh recruiter action", () => {
    const warning = recruiterInactivity("2026-11-19T11:00:00.000Z", now);
    assert.equal(warning.stale, false);
  });
});

describe("candidate claim", () => {
  it("lets a recruiter take an unclaimed candidate", () => {
    assert.deepEqual(evaluateClaimAttempt({ claimedById: null }, "anna"), { ok: true });
  });

  it("blocks a second recruiter from taking the same candidate", () => {
    assert.deepEqual(evaluateClaimAttempt({ claimedById: "anna" }, "max"), {
      ok: false,
      reason: "claimed_by_other",
    });
  });

  it("lets the owner complete the claim and an admin force-release", () => {
    assert.deepEqual(evaluateReleaseAttempt({ claimedById: "anna" }, { id: "anna", canForce: false }), {
      ok: true,
      mode: "owner",
    });
    assert.deepEqual(evaluateReleaseAttempt({ claimedById: "anna" }, { id: "max", canForce: false }), {
      ok: false,
      reason: "forbidden",
    });
    assert.deepEqual(evaluateReleaseAttempt({ claimedById: "anna" }, { id: "gl", canForce: true }), {
      ok: true,
      mode: "force",
    });
  });

  it("keeps concurrent claims exclusive", () => {
    assert.deepEqual(evaluateConcurrentClaims(1, 0), { firstWon: true, secondWon: false, conflict: false });
    assert.deepEqual(evaluateConcurrentClaims(0, 1), { firstWon: false, secondWon: true, conflict: false });
    assert.deepEqual(evaluateConcurrentClaims(1, 1), { firstWon: true, secondWon: true, conflict: true });
  });

  it("formats list and live copy", () => {
    assert.equal(claimStatusLabel("Koray Balkaymak"), "In Bearbeitung durch Koray Balkaymak");
    assert.equal(claimLiveLabel("Koray Balkaymak"), "Koray bearbeitet diesen Kandidaten gerade.");
  });
});
