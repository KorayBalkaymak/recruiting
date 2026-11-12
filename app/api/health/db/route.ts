import { NextResponse } from "next/server";
import {
  DATABASE_URL_ENV_CANDIDATES,
  diagnoseDatabaseUrl,
  formatDatabaseUrlDiagnosis,
  neonHttpSqlEndpoint,
  resolveDatabaseUrl,
  summarizeDbError,
  toNeonConnectionParams,
} from "@/lib/db/database-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Safe DB env diagnosis (no connection string values).
 * Enable with ENABLE_DB_HEALTH=true, then open /api/health/db
 * and optionally ?probe=1 to run SELECT 1.
 */
export async function GET(request: Request) {
  if (process.env.ENABLE_DB_HEALTH !== "true") {
    return NextResponse.json(
      { ok: false, error: "DB health disabled. Set ENABLE_DB_HEALTH=true temporarily." },
      { status: 404 }
    );
  }

  const sources = DATABASE_URL_ENV_CANDIDATES.map((name) => {
    const raw = process.env[name];
    const diagnosis = diagnoseDatabaseUrl(raw);
    return {
      name,
      set: raw != null && String(raw).trim().length > 0,
      diagnosis,
      summary: formatDatabaseUrlDiagnosis({ ...diagnosis, source: name }),
    };
  });

  let resolved: {
    source: string;
    summary: string;
    host: string | null;
    database: string | null;
    endpoint: string | null;
  } | null = null;
  let resolveError: string | null = null;
  try {
    const r = resolveDatabaseUrl(process.env);
    const params = toNeonConnectionParams(r.url);
    resolved = {
      source: r.source,
      summary: formatDatabaseUrlDiagnosis({ ...r.diagnosis, source: r.source }),
      host: params.host,
      database: params.database,
      endpoint: neonHttpSqlEndpoint(params.host),
    };
  } catch (error) {
    resolveError = error instanceof Error ? error.message : "resolve failed";
  }

  let probe: { ok: boolean; detail: string } | null = null;
  const wantProbe = new URL(request.url).searchParams.get("probe") === "1";
  if (wantProbe && resolved) {
    try {
      const { sql } = await import("drizzle-orm");
      const { getDb } = await import("@/lib/db");
      await getDb().execute(sql`select 1 as ok`);
      probe = { ok: true, detail: "select 1 succeeded via getDb()" };
    } catch (error) {
      probe = {
        ok: false,
        detail: summarizeDbError(error),
      };
    }
  }

  return NextResponse.json({
    ok: Boolean(resolved) && (probe ? probe.ok : true),
    commitHint: "Expect deploy with discrete Neon params + https fetch guard",
    demoMode: process.env.NEXT_PUBLIC_DEMO_MODE ?? null,
    betterAuthUrlSet: Boolean(
      process.env.BETTER_AUTH_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim()
    ),
    resolved,
    resolveError,
    sources,
    probe,
  });
}
