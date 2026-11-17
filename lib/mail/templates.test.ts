import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { redactEmail, redactUrlForLog } from "./log.ts";
import { rewriteEmailVerificationUrl, rewriteResetCallbackUrl } from "./send-url.ts";
import {
  buildCandidateVerificationEmail,
  buildPasswordResetEmail,
  buildPortalStatusEmail,
  buildStaffInviteEmail,
  classifyPasswordEmailKind,
} from "./templates.ts";

describe("mail templates + redaction (BA5.1)", () => {
  it("builds invite and reset mails without embedding credentials", () => {
    const invite = buildStaffInviteEmail({
      to: "new@cms-platform.de",
      fullName: "Anna Recruiter",
      setupUrl: "https://app.example/login/set-password?token=abc",
    });
    assert.equal(invite.kind, "staff_invite");
    assert.match(invite.text, /Passwort/);
    assert.equal(invite.text.includes("password="), false);

    const reset = buildPasswordResetEmail({
      to: "user@cms-platform.de",
      resetUrl: "https://app.example/login/set-password?token=xyz",
    });
    assert.equal(reset.kind, "password_reset");
    assert.equal(classifyPasswordEmailKind(true), "staff_invite");
    assert.equal(classifyPasswordEmailKind(false), "password_reset");
  });

  it("builds portal status notification with safe labels", () => {
    const mail = buildPortalStatusEmail({
      to: "candidate@example.com",
      firstName: "Max",
      status: "changes_requested",
      note: "Bitte Lebenslauf aktualisieren",
      statusUrl: "https://app.example/candidate/status",
    });
    assert.equal(mail.kind, "portal_status");
    assert.match(mail.subject, /Änderungen angefordert/);
    assert.match(mail.text, /Lebenslauf/);
  });

  it("redacts email local-part and URL query tokens", () => {
    assert.equal(redactEmail("anna.recruiter@cms-platform.de"), "***@cms-platform.de");
    assert.equal(
      redactUrlForLog("https://app.example/login/set-password?token=super-secret"),
      "https://app.example/login/set-password"
    );
  });

  it("rewrites Better Auth reset callback URLs to set-password", () => {
    const url =
      "http://localhost:3000/api/auth/reset-password/tok_abc?callbackURL=" +
      encodeURIComponent("http://localhost:3000/login/set-password");
    const rewritten = rewriteResetCallbackUrl(url);
    assert.equal(
      rewritten,
      "http://localhost:3000/login/set-password?token=tok_abc"
    );
  });

  it("builds candidate verification mail and drops callbackURL from the verify link", () => {
    const mail = buildCandidateVerificationEmail({
      to: "talent@example.com",
      fullName: "Max Talent",
      verifyUrl: "https://app.example/candidate/verify-email?token=abc",
    });
    assert.equal(mail.kind, "email_verification");
    assert.match(mail.text, /24 Stunden/);
    assert.equal(mail.text.includes("https://evil.example"), false);

    const betterAuthUrl =
      "http://localhost:3000/api/auth/verify-email?token=tok_verify&callbackURL=" +
      encodeURIComponent("https://evil.example/phish");
    assert.equal(
      rewriteEmailVerificationUrl(betterAuthUrl, "http://localhost:3000"),
      "http://localhost:3000/candidate/verify-email?token=tok_verify"
    );
    assert.throws(() => rewriteEmailVerificationUrl("https://evil.example/no-token"));
  });
});
