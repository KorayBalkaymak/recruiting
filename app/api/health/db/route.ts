import { NextResponse } from "next/server";
import {
  DATABASE_URL_ENV_CANDIDATES,
  diagnoseDatabaseUrl,
  formatDatabaseUrlDiagnosis,
  neonHttpSqlEndpoint,
  parseNeonConnectionString,
  resolveDatabaseUrl,
  summarizeDbError,
  toNeonConnectionParams,
} from "@/lib/db/database-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function publicTargetFromResolvedUrl(normalizedUrl: string): {
  host: string;
  port: number;
  portSource: "uri" | "default-5432";
  database: string;
} {
  const params = toNeonConnectionParams(normalizedUrl);
  const parsed = parseNeonConnectionString(normalizedUrl);
  const uriPort = parsed?.port?.trim() ?? "";
  if (uriPort && /^\d+$/.test(uriPort)) {
    return {
      host: params.host,
      port: Number(uriPort),
      portSource: "uri",
      database: params.database,
    };
  }
  return {
    host: params.host,
    port: 5432,
    portSource: "default-5432",
    database: params.database,
  };
}

/**
 * Temporary Production diagnosis (ENABLE_DB_HEALTH=true only).
 * Returns host/port/database metadata — never URI, userinfo, or query string.
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

  const environment = process.env.VERCEL_ENV ?? null;

  let resolved: {
    source: string;
    summary: string;
    host: string | null;
    port: number | null;
    portSource: "uri" | "default-5432" | null;
    database: string | null;
    endpoint: string | null;
  } | null = null;
  let resolveError: string | null = null;
  try {
    const r = resolveDatabaseUrl(process.env);
    const target = publicTargetFromResolvedUrl(r.url);
    resolved = {
      source: r.source,
      summary: formatDatabaseUrlDiagnosis({ ...r.diagnosis, source: r.source }),
      host: target.host,
      port: target.port,
      portSource: target.portSource,
      database: target.database,
      endpoint: neonHttpSqlEndpoint(target.host),
    };
  } catch {
    resolveError = "database url missing or invalid";
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
    environment,
    host: resolved?.host ?? null,
    port: resolved?.port ?? null,
    portSource: resolved?.portSource ?? null,
    database: resolved?.database ?? null,
    source: resolved?.source ?? null,
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
