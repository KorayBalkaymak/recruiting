import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveNeonFetchUrl } from "./neon-fetch.ts";

describe("resolveNeonFetchUrl", () => {
  it("keeps https strings", () => {
    assert.equal(resolveNeonFetchUrl("https://api.example.com/sql"), "https://api.example.com/sql");
  });

  it("reads URL objects", () => {
    assert.equal(resolveNeonFetchUrl(new URL("https://api.example.com/sql")), "https://api.example.com/sql");
  });

  it("does not invent a URL from empty input", () => {
    assert.equal(resolveNeonFetchUrl(null), "");
    assert.equal(resolveNeonFetchUrl({ url: "" }), "");
  });
});
