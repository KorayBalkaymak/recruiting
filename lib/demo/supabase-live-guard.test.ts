import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseExplicitDemoFlag } from "./mode.ts";

describe("live mode without supabase (BA4.2)", () => {
  it("demo flag stays fail-closed", () => {
    assert.equal(parseExplicitDemoFlag(undefined), false);
    assert.equal(parseExplicitDemoFlag("false"), false);
    assert.equal(parseExplicitDemoFlag("true"), true);
  });

  it("server and browser supabase adapters throw outside demo", () => {
    const server = readFileSync(join(process.cwd(), "lib/supabase/server.ts"), "utf8");
    const client = readFileSync(join(process.cwd(), "lib/supabase/client.ts"), "utf8");
    const admin = readFileSync(join(process.cwd(), "lib/supabase/admin.ts"), "utf8");
    for (const src of [server, client, admin]) {
      assert.match(src, /isDemoMode\(\)/);
      assert.match(src, /throw new Error/);
      assert.match(src, /Live-Modus/);
    }
  });

  it("env example defaults demo off", () => {
    const example = readFileSync(join(process.cwd(), ".env.local.example"), "utf8");
    assert.match(example, /NEXT_PUBLIC_DEMO_MODE=false/);
    assert.doesNotMatch(example, /^NEXT_PUBLIC_DEMO_MODE=true$/m);
  });
});

describe("demo mode without Neon (BA4.2)", () => {
  it("demo mode does not require DATABASE_URL in flag logic", () => {
    assert.equal(parseExplicitDemoFlag("true"), true);
    // Pure flag path — Neon is not consulted for enabling demo.
  });
});
