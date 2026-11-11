import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeDatabaseUrl } from "./database-url.ts";

describe("normalizeDatabaseUrl", () => {
  it("accepts a plain postgres URL", () => {
    const url = "postgresql://user:pass@ep-x.eu-central-1.aws.neon.tech/db?sslmode=require";
    assert.equal(normalizeDatabaseUrl(url), url);
  });

  it("strips surrounding double quotes (Vercel paste)", () => {
    const inner = "postgresql://user:pass@host/db?sslmode=require&channel_binding=require";
    assert.equal(normalizeDatabaseUrl(`"${inner}"`), inner);
  });

  it("strips surrounding single quotes and whitespace", () => {
    const inner = "postgres://user:pass@host/db";
    assert.equal(normalizeDatabaseUrl(`  '${inner}'  `), inner);
  });

  it("rejects missing / empty", () => {
    assert.throws(() => normalizeDatabaseUrl(undefined), /nicht gesetzt/);
    assert.throws(() => normalizeDatabaseUrl("   "), /leer/);
    assert.throws(() => normalizeDatabaseUrl('""'), /leer/);
  });

  it("rejects non-postgres schemes", () => {
    assert.throws(() => normalizeDatabaseUrl("https://example.com/db"), /postgresql/);
  });
});
