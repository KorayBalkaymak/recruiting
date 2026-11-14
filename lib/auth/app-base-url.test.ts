import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collectAuthTrustedOrigins,
  normalizeAppBaseUrl,
  resolveAuthBaseUrl,
} from "./app-base-url.ts";

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
  it("includes local loopback ports off Vercel", () => {
    const origins = collectAuthTrustedOrigins({
      BETTER_AUTH_URL: "http://localhost:3002",
    } as NodeJS.ProcessEnv);
    assert.ok(origins.includes("http://localhost:3002"));
    assert.ok(origins.includes("http://localhost:3000"));
    assert.ok(origins.includes("http://localhost:3003"));
  });

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

describe("resolveAuthBaseUrl", () => {
  it("skips localhost on Vercel and uses VERCEL_URL", () => {
    const origin = resolveAuthBaseUrl({
      VERCEL: "1",
      BETTER_AUTH_URL: "http://localhost:3000",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      VERCEL_URL: "my-app.vercel.app",
    } as NodeJS.ProcessEnv);
    assert.equal(origin, "https://my-app.vercel.app");
  });
});
