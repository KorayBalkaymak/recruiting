import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  diagnoseDatabaseUrl,
  normalizeDatabaseUrl,
  parseNeonConnectionString,
  resolveDatabaseUrl,
} from "./database-url.ts";

describe("normalizeDatabaseUrl", () => {
  it("accepts a plain postgres URL", () => {
    const url = "postgresql://user:pass@ep-x.eu-central-1.aws.neon.tech/db?sslmode=require";
    assert.equal(normalizeDatabaseUrl(url), url);
  });

  it("strips surrounding double quotes (Vercel paste)", () => {
    const inner = "postgresql://user:pass@host/db?sslmode=require&channel_binding=require";
    assert.equal(normalizeDatabaseUrl(`"${inner}"`), inner);
  });

  it("strips smart quotes, backticks, BOM and CR", () => {
    const inner = "postgresql://user:pass@host/db";
    assert.equal(normalizeDatabaseUrl(`\u201C${inner}\u201D`), inner);
    assert.equal(normalizeDatabaseUrl(`\`${inner}\``), inner);
    assert.equal(normalizeDatabaseUrl(`\uFEFF${inner}`), inner);
    assert.equal(normalizeDatabaseUrl(`${inner}\r`), inner);
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

describe("resolveDatabaseUrl", () => {
  it("falls back to POSTGRES_URL when DATABASE_URL is invalid", () => {
    const good = "postgresql://user:pass@ep-x.eu-central-1.aws.neon.tech/neondb";
    const resolved = resolveDatabaseUrl({
      DATABASE_URL: "not-a-url",
      POSTGRES_URL: good,
    } as NodeJS.ProcessEnv);
    assert.equal(resolved.source, "POSTGRES_URL");
    assert.equal(resolved.url, good);
  });

  it("prefers DATABASE_URL when valid (even if quoted)", () => {
    const good = "postgresql://user:pass@ep-x.eu-central-1.aws.neon.tech/neondb";
    const resolved = resolveDatabaseUrl({
      DATABASE_URL: `"${good}"`,
      POSTGRES_URL: "postgresql://other:pass@host/db",
    } as NodeJS.ProcessEnv);
    assert.equal(resolved.source, "DATABASE_URL");
    assert.equal(resolved.url, good);
  });
});

describe("diagnoseDatabaseUrl", () => {
  it("reports quote wrappers without exposing secrets", () => {
    const d = diagnoseDatabaseUrl(
      '"postgresql://user:pass@ep-x.eu-central-1.aws.neon.tech/neondb"'
    );
    assert.equal(d.wrapper, "double-quote");
    assert.equal(d.schemeOk, true);
    assert.equal(d.neonParseOk, true);
    assert.equal(d.hasHost, true);
    assert.equal(d.firstCharCode, 34);
  });
});

describe("parseNeonConnectionString", () => {
  it("matches neon driver parse for valid URLs", () => {
    const parsed = parseNeonConnectionString(
      "postgresql://user:pass@ep-x.eu-central-1.aws.neon.tech/neondb"
    );
    assert.ok(parsed);
    assert.equal(parsed.hostname, "ep-x.eu-central-1.aws.neon.tech");
    assert.equal(parsed.username, "user");
    assert.equal(parsed.pathname, "/neondb");
  });

  it("returns null for quoted URLs", () => {
    assert.equal(
      parseNeonConnectionString('"postgresql://user:pass@host/db"'),
      null
    );
  });
});
