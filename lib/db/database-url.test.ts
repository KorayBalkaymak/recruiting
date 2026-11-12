import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  diagnoseDatabaseUrl,
  neonHttpSqlEndpoint,
  normalizeDatabaseUrl,
  parseNeonConnectionString,
  resolveDatabaseUrl,
} from "./database-url.ts";

describe("normalizeDatabaseUrl", () => {
  it("accepts a plain postgres URL", () => {
    const url = "postgresql://user:pass@ep-x.eu-central-1.aws.neon.tech/db?sslmode=require";
    assert.equal(normalizeDatabaseUrl(url), url);
  });

  it("strips surrounding double quotes and channel_binding", () => {
    const raw =
      '"postgresql://user:pass@host/db?sslmode=require&channel_binding=require"';
    assert.equal(
      normalizeDatabaseUrl(raw),
      "postgresql://user:pass@host/db?sslmode=require"
    );
  });

  it("strips smart quotes, backticks, BOM, CR and trailing sentence dot", () => {
    const inner = "postgresql://user:pass@host/db";
    assert.equal(normalizeDatabaseUrl(`\u201C${inner}\u201D`), inner);
    assert.equal(normalizeDatabaseUrl(`\`${inner}\``), inner);
    assert.equal(normalizeDatabaseUrl(`\uFEFF${inner}`), inner);
    assert.equal(normalizeDatabaseUrl(`${inner}\r`), inner);
    assert.equal(
      normalizeDatabaseUrl(
        "postgresql://user:pass@host/db?sslmode=require&channel_binding=require."
      ),
      "postgresql://user:pass@host/db?sslmode=require"
    );
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

  it("encodes raw # / ? in passwords so Neon can parse the URL", () => {
    const host = "ep-x.eu-central-1.aws.neon.tech";
    for (const pass of ["foo#bar", "foo/bar", "foo?bar"]) {
      const raw = `postgresql://neondb_owner:${pass}@${host}/neondb?sslmode=require`;
      const normalized = normalizeDatabaseUrl(raw);
      assert.match(normalized, /postgresql:\/\/neondb_owner:[^@]+@ep-x/);
      assert.ok(parseNeonConnectionString(normalized));
      assert.equal(
        decodeURIComponent(normalized.split("://")[1]!.split("@")[0]!.split(":")[1]!),
        pass
      );
    }
  });

  it("does not double-encode already-encoded passwords", () => {
    const raw =
      "postgresql://u:foo%23bar@ep-x.eu-central-1.aws.neon.tech/neondb?sslmode=require";
    assert.equal(normalizeDatabaseUrl(raw), raw);
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

describe("neonHttpSqlEndpoint", () => {
  it("rewrites first DNS label to api", () => {
    assert.equal(
      neonHttpSqlEndpoint("ep-plain-leaf-bekvp7pg.c-9.us-east-2.aws.neon.tech"),
      "https://api.c-9.us-east-2.aws.neon.tech/sql"
    );
  });
});
