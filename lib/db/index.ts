import "server-only";

import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import {
  formatDatabaseUrlDiagnosis,
  neonHttpSqlEndpoint,
  parseNeonConnectionString,
  resolveDatabaseUrl,
} from "./database-url";
import * as schema from "./schema";

export type Database = NeonHttpDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { cmsDb?: Database };

export function getDb(): Database {
  if (globalForDb.cmsDb) return globalForDb.cmsDb;

  const { url, source, diagnosis } = resolveDatabaseUrl(process.env);
  const parsed = parseNeonConnectionString(url);
  if (!parsed?.hostname) {
    throw new Error(
      `DATABASE_URL Host fehlt nach Normalisierung. (${formatDatabaseUrlDiagnosis({
        ...diagnosis,
        source,
      })})`
    );
  }

  // Explicit endpoint avoids ambiguous host rewrites on newer Neon `c-N` hostnames.
  const endpoint = neonHttpSqlEndpoint(parsed.hostname);
  try {
    // Validate before first query (surfaces ERR_INVALID_URL clearly in logs).
    // eslint-disable-next-line no-new
    new URL(endpoint);
  } catch {
    throw new Error(
      `Neon HTTP-Endpoint ungültig (host=${parsed.hostname}). (${formatDatabaseUrlDiagnosis({
        ...diagnosis,
        source,
      })})`
    );
  }

  neonConfig.fetchEndpoint = endpoint;

  console.info(
    `[db] using ${source} endpoint_host=${new URL(endpoint).hostname} (${formatDatabaseUrlDiagnosis({
      ...diagnosis,
      source,
    })})`
  );

  try {
    const database = drizzle(neon(url), { schema });
    globalForDb.cmsDb = database;
    return database;
  } catch (error) {
    throw new Error(
      `Neon-Client Init fehlgeschlagen. (${formatDatabaseUrlDiagnosis({
        ...diagnosis,
        source,
      })}) Original: ${error instanceof Error ? error.message : "unknown"}`
    );
  }
}
