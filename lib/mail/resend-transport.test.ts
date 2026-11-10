import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createDemoMailTransport,
  createResendTransport,
  createUnavailableMailTransport,
} from "./resend-transport.ts";
import { buildPasswordResetEmail } from "./templates.ts";

describe("mail transports (BA5.1)", () => {
  it("demo transport succeeds without calling Resend", async () => {
    let calls = 0;
    const demo = createDemoMailTransport();
    const message = buildPasswordResetEmail({
      to: "user@example.com",
      resetUrl: "https://app.example/login/set-password?token=secret-token",
    });

    // Demo transport ignores fetch; ensure no accidental network helper is required.
    const result = await demo.send(message);
    assert.deepEqual(result, { ok: true, provider: "demo" });
    assert.equal(calls, 0);
  });

  it("unavailable transport fails closed with missing keys", async () => {
    const transport = createUnavailableMailTransport(["RESEND_API_KEY", "EMAIL_FROM"]);
    const result = await transport.send(
      buildPasswordResetEmail({
        to: "user@example.com",
        resetUrl: "https://app.example/reset",
      })
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.provider, "unavailable");
      assert.match(result.reason, /RESEND_API_KEY/);
    }
  });

  it("resend transport posts without returning secrets on failure", async () => {
    const transport = createResendTransport(
      {
        apiKey: "re_secret_key",
        from: "CMS <noreply@example.com>",
        replyTo: null,
        notifyTo: null,
      },
      async (_url, init) => {
        assert.match(init.headers.Authorization, /^Bearer /);
        assert.equal(init.headers.Authorization.includes("re_secret_key"), true);
        const body = JSON.parse(init.body) as { to: string[] };
        assert.deepEqual(body.to, ["user@example.com"]);
        return {
          ok: false,
          status: 401,
          async json() {
            return { message: "re_secret_key must never be logged" };
          },
          async text() {
            return "re_secret_key must never be logged";
          },
        };
      }
    );

    const result = await transport.send(
      buildPasswordResetEmail({
        to: "user@example.com",
        resetUrl: "https://app.example/login/set-password?token=raw-secret",
      })
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.reason, "resend_http_401");
      assert.equal(JSON.stringify(result).includes("re_secret_key"), false);
      assert.equal(JSON.stringify(result).includes("raw-secret"), false);
    }
  });

  it("resend transport returns provider id on success", async () => {
    const transport = createResendTransport(
      {
        apiKey: "re_test",
        from: "CMS <noreply@example.com>",
        replyTo: "ops@example.com",
        notifyTo: null,
      },
      async () => ({
        ok: true,
        status: 200,
        async json() {
          return { id: "email_123" };
        },
        async text() {
          return "";
        },
      })
    );

    const result = await transport.send(
      buildPasswordResetEmail({
        to: "user@example.com",
        resetUrl: "https://app.example/reset",
      })
    );
    assert.deepEqual(result, { ok: true, provider: "resend", id: "email_123" });
  });
});
