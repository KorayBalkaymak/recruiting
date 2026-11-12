import { NextResponse } from "next/server";
import {
  DATABASE_URL_ENV_CANDIDATES,
  diagnoseDatabaseUrl,
  formatDatabaseUrlDiagnosis,
  resolveDatabaseUrl,
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

  let resolved: { source: string; summary: string } | null = null;
  let resolveError: string | null = null;
  try {
    const r = resolveDatabaseUrl(process.env);
    resolved = {
      source: r.source,
      summary: formatDatabaseUrlDiagnosis({ ...r.diagnosis, source: r.source }),
    };
  } catch (error) {
    resolveError = error instanceof Error ? error.message : "resolve failed";
  }

  let probe: { ok: boolean; detail: string } | null = null;
  const wantProbe = new URL(request.url).searchParams.get("probe") === "1";
  if (wantProbe && resolved) {
    try {
      const { neon } = await import("@neondatabase/serverless");
      const { url } = resolveDatabaseUrl(process.env);
      const sql = neon(url);
      await sql`select 1 as ok`;
      probe = { ok: true, detail: "select 1 succeeded" };
    } catch (error) {
      const err = error as { message?: string; cause?: { code?: string; name?: string } };
      probe = {
        ok: false,
        detail: [
          err?.message ?? "probe failed",
          err?.cause?.name ? `causeName=${err.cause.name}` : null,
          err?.cause?.code ? `causeCode=${err.cause.code}` : null,
        ]
          .filter(Boolean)
          .join(" | "),
      };
    }
  }

  return NextResponse.json({
    ok: Boolean(resolved) && (probe ? probe.ok : true),
    commitHint: "Expect deploy >= 75553ed for password-encoding fix",
    demoMode: process.env.NEXT_PUBLIC_DEMO_MODE ?? null,
    resolved,
    resolveError,
    sources,
    probe,
  });
}
