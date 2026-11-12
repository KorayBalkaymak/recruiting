import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeAppBaseUrl } from "./app-base-url.ts";

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
