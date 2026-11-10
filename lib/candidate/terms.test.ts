import assert from "node:assert/strict";
import { describe, it } from "node:test";

const { assertSearchRadius, normalizeTerm, sanitizeTermList } = await import(
  new URL("./terms.ts", import.meta.url).href
);

describe("candidate terms", () => {
  it("normalizes terms", () => {
    assert.equal(normalizeTerm("  TypeScript  "), "typescript");
    assert.equal(normalizeTerm("Node   JS"), "node js");
  });

  it("deduplicates and caps term lists", () => {
    const terms = sanitizeTermList(["React", " react ", "Vue", ""], "skill");
    assert.deepEqual(terms, ["React", "Vue"]);
  });

  it("rejects invalid search radius", () => {
    assert.throws(() => assertSearchRadius(0));
    assert.throws(() => assertSearchRadius(201));
    assert.doesNotThrow(() => assertSearchRadius(50));
  });
});
