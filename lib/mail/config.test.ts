import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hasResendConfig,
  isPlausibleEmailFrom,
  readResendConfigFromEnv,
} from "./config.ts";

describe("Resend mail config (BA5.1)", () => {
  it("reports missing keys without exposing secrets", () => {
    const parsed = readResendConfigFromEnv({
      RESEND_API_KEY: "",
      EMAIL_FROM: "CMS <noreply@example.com>",
      EMAIL_REPLY_TO: "secret-should-not-appear@example.com",
    });
    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.deepEqual(parsed.missing, ["RESEND_API_KEY"]);
      assert.deepEqual(parsed.invalid, []);
      assert.equal(JSON.stringify(parsed).includes("secret-should-not-appear"), false);
    }
  });

  it("rejects malformed EMAIL_FROM without inventing addresses", () => {
    const parsed = readResendConfigFromEnv({
      RESEND_API_KEY: "re_test_key",
      EMAIL_FROM: "not-an-email",
    });
    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.deepEqual(parsed.invalid, ["EMAIL_FROM"]);
    }
    assert.equal(isPlausibleEmailFrom("CMS <noreply@example.com>"), true);
  });

  it("accepts a complete config including optional notify/reply", () => {
    const env = {
      RESEND_API_KEY: "re_test_key",
      EMAIL_FROM: "CMS <noreply@example.com>",
      EMAIL_REPLY_TO: "support@example.com",
      EMAIL_NOTIFY_TO: "recruiting@example.com",
    };
    assert.equal(hasResendConfig(env), true);
    const parsed = readResendConfigFromEnv(env);
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.config.from, "CMS <noreply@example.com>");
      assert.equal(parsed.config.replyTo, "support@example.com");
      assert.equal(parsed.config.notifyTo, "recruiting@example.com");
    }
  });
});
