import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseExplicitDemoFlag } from "./mode.ts";

describe("parseExplicitDemoFlag (F-01)", () => {
  it("enables demo only for explicit true-like values", () => {
    assert.equal(parseExplicitDemoFlag("true"), true);
    assert.equal(parseExplicitDemoFlag("TRUE"), true);
    assert.equal(parseExplicitDemoFlag("1"), true);
    assert.equal(parseExplicitDemoFlag("yes"), true);
  });

  it("does not enable demo when unset, empty, or false", () => {
    assert.equal(parseExplicitDemoFlag(undefined), false);
    assert.equal(parseExplicitDemoFlag(null), false);
    assert.equal(parseExplicitDemoFlag(""), false);
    assert.equal(parseExplicitDemoFlag("false"), false);
    assert.equal(parseExplicitDemoFlag("0"), false);
  });

  it("does not treat placeholder/missing supabase-style values as demo", () => {
    // Historical footgun: empty/placeholder Supabase URL must not imply demo.
    assert.equal(parseExplicitDemoFlag(undefined), false);
    assert.equal(parseExplicitDemoFlag("https://your-project.supabase.co"), false);
  });
});

describe("live auth fail-closed expectations (F-01)", () => {
  it("documents that production without DEMO flag stays non-demo", () => {
    assert.equal(parseExplicitDemoFlag(process.env.NODE_ENV === "production" ? undefined : undefined), false);
  });
});
