import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clearInviteAwaitingPasswordEmail,
  countInvitesAwaitingPasswordEmail,
  isInviteAwaitingPasswordEmail,
  markInviteAwaitingPasswordEmail,
} from "../auth/invite-delivery.ts";
import { parseExplicitDemoFlag } from "../demo/mode.ts";
import { createDemoMailTransport, createUnavailableMailTransport } from "./resend-transport.ts";
import { buildStaffInviteEmail } from "./templates.ts";

describe("mail permissions + demo (BA5.1)", () => {
  it("keeps demo mode fail-closed unless explicitly enabled", () => {
    assert.equal(parseExplicitDemoFlag(undefined), false);
    assert.equal(parseExplicitDemoFlag("false"), false);
    assert.equal(parseExplicitDemoFlag("true"), true);
  });

  it("demo transport never requires provider credentials", async () => {
    const demo = createDemoMailTransport();
    const unavailable = createUnavailableMailTransport(["RESEND_API_KEY"]);
    const message = buildStaffInviteEmail({
      to: "invitee@cms-platform.de",
      fullName: "Invitee",
      setupUrl: "https://app.example/login/set-password?token=t",
    });

    assert.deepEqual(await demo.send(message), { ok: true, provider: "demo" });
    const blocked = await unavailable.send(message);
    assert.equal(blocked.ok, false);
  });

  it("tracks awaiting password emails without storing tokens", () => {
    const email = `awaiting-${Date.now()}@cms-platform.de`;
    markInviteAwaitingPasswordEmail(email);
    assert.equal(isInviteAwaitingPasswordEmail(email), true);
    assert.ok(countInvitesAwaitingPasswordEmail() >= 1);
    clearInviteAwaitingPasswordEmail(email);
    assert.equal(isInviteAwaitingPasswordEmail(email), false);
  });
});
