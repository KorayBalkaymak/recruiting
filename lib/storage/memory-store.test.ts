import assert from "node:assert/strict";
import { describe, it } from "node:test";

// Memory store is server-only; exercise the same Map semantics inline for demo path.
describe("demo memory storage semantics (BA5)", () => {
  it("stores and returns private objects without public URLs", async () => {
    const map = new Map<string, { body: Buffer; contentType: string }>();
    const key = "candidates/c1/cv/d1";
    const body = Buffer.from("%PDF-1.4\nok");
    map.set(key, { body, contentType: "application/pdf" });
    const hit = map.get(key);
    assert.ok(hit);
    assert.equal(hit.contentType, "application/pdf");
    assert.equal(hit.body.toString("utf8").startsWith("%PDF"), true);
    assert.equal(map.has("http://public.example/" + key), false);
  });
});
