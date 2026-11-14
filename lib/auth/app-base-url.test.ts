import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { collectAuthTrustedOrigins, normalizeAppBaseUrl } from "./app-base-url.ts";

describe("normalizeAppBaseUrl", () => {
  it("keeps https origins", () => {
    assert.equal(normalizeAppBaseUrl("https://app.example.com/path"), "https://app.example.com");
  });

  it("strips quotes and prefixes bare hosts with https", () => {
    assert.equal(normalizeAppBaseUrl('"my-app.vercel.app"'), "https://my-app.vercel.app");
    assert.equal(normalizeAppBaseUrl("my-app.vercel.app"), "https://my-app.vercel.app");
  });

  it("rejects non-http schemes", () => {
    assert.throws(() => normalizeAppBaseUrl("ftp://example.com"), /http\(s\)/);
  });
});

describe("collectAuthTrustedOrigins", () => {
  it("includes Vercel hosts without exposing secrets", () => {
    const origins = collectAuthTrustedOrigins({
      BETTER_AUTH_URL: "https://app.example.com",
      VERCEL_URL: "app-git-main-user.vercel.app",
      VERCEL_PROJECT_PRODUCTION_URL: "app.example.com",
    } as NodeJS.ProcessEnv);
    assert.ok(origins.includes("https://app.example.com"));
    assert.ok(origins.includes("https://app-git-main-user.vercel.app"));
  });
});
