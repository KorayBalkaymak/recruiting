import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  decideCandidateLoginAccess,
  isVerifiedCandidateUser,
  mapVerifyEmailError,
  parseVerifyEmailPageStatus,
  runCandidateVerificationSend,
  shouldSendCandidateVerificationEmail,
} from "./email-verification.ts";
import { isDuplicateSignupError } from "./auth-messages.ts";
import { buildCandidateVerificationEmail } from "../mail/templates.ts";

describe("candidate email verification helpers", () => {
  it("treats only verified candidate users as portal-ready", () => {
    assert.equal(isVerifiedCandidateUser({ role: "candidate", emailVerified: true }), true);
    assert.equal(isVerifiedCandidateUser({ role: "candidate", emailVerified: false }), false);
    assert.equal(isVerifiedCandidateUser({ role: "admin", emailVerified: false }), false);
    assert.equal(isVerifiedCandidateUser({ role: "admin", emailVerified: true }), false);
    assert.equal(isVerifiedCandidateUser(null), false);
  });

  it("maps Better Auth verify errors without leaking internals", () => {
    assert.equal(mapVerifyEmailError({ body: { code: "TOKEN_EXPIRED" } }), "expired");
    assert.equal(mapVerifyEmailError({ body: { code: "INVALID_TOKEN" } }), "invalid");
    assert.equal(mapVerifyEmailError(new Error("JWTExpired: exp")), "expired");
    assert.equal(parseVerifyEmailPageStatus("resent"), "resent");
    assert.equal(parseVerifyEmailPageStatus("javascript:alert(1)"), "check");
  });

  it("detects duplicate signup without treating it as a generic failure", () => {
    assert.equal(isDuplicateSignupError({ body: { code: "USER_ALREADY_EXISTS" } }), true);
    assert.equal(isDuplicateSignupError({ body: { code: "INVALID_EMAIL" } }), false);
  });

  it("sends verification mail for candidates even if role is missing on the user object", () => {
    assert.equal(shouldSendCandidateVerificationEmail({ role: "candidate" }), true);
    assert.equal(shouldSendCandidateVerificationEmail({}), true);
  });

  it("does not send verification mail for staff invites", () => {
    assert.equal(shouldSendCandidateVerificationEmail({ role: "recruiter" }), false);
    assert.equal(shouldSendCandidateVerificationEmail({ role: "admin" }), false);
    assert.equal(shouldSendCandidateVerificationEmail({ role: "kam" }), false);
    assert.equal(shouldSendCandidateVerificationEmail({ role: "geschaeftsleitung" }), false);
  });

  it("dispatches Resend to the candidate address and skips staff", async () => {
    const sent: string[] = [];
    const candidate = { email: "talent@example.com", role: "candidate" as const };
    const result = await runCandidateVerificationSend(candidate, async () => {
      sent.push(candidate.email);
      return "sent";
    });
    assert.equal(result, "sent");
    assert.deepEqual(sent, ["talent@example.com"]);

    const skipped = await runCandidateVerificationSend(
      { email: "recruiter@example.com", role: "admin" },
      async () => {
        throw new Error("staff must not receive candidate verification");
      }
    );
    assert.equal(skipped, "skipped");

    const mail = buildCandidateVerificationEmail({
      to: "talent@example.com",
      verifyUrl: "https://app.example/candidate/verify-email?token=t",
    });
    assert.equal(mail.to, "talent@example.com");
    assert.equal(mail.kind, "email_verification");
  });

  it("does not grant portal access when verification send fails", async () => {
    await assert.rejects(
      () =>
        runCandidateVerificationSend({ email: "talent@example.com", role: "candidate" }, async () => {
          throw new Error("E-Mail-Versand ist fehlgeschlagen.");
        }),
      /fehlgeschlagen/
    );
    assert.equal(
      decideCandidateLoginAccess({ role: "candidate", emailVerified: false }),
      "unverified"
    );
  });

  it("rejects staff and unverified candidates at login; allows verified candidates", () => {
    assert.equal(
      decideCandidateLoginAccess({ role: "admin", emailVerified: true }),
      "not_candidate"
    );
    assert.equal(
      decideCandidateLoginAccess({ role: "recruiter", emailVerified: false }),
      "not_candidate"
    );
    assert.equal(
      decideCandidateLoginAccess({ role: "candidate", emailVerified: false }),
      "unverified"
    );
    assert.equal(
      decideCandidateLoginAccess({ role: "candidate", emailVerified: true }),
      "authenticated"
    );
    assert.equal(decideCandidateLoginAccess(null), "invalid");
  });
});
