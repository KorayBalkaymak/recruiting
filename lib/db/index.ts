import "server-only";

import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import {
  diagnoseDatabaseUrl,
  formatDatabaseUrlDiagnosis,
  neonHttpSqlEndpoint,
  resolveDatabaseUrl,
  summarizeDbError,
  toNeonConnectionParams,
} from "./database-url";
import * as schema from "./schema";

export type Database = NeonHttpDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { cmsDb?: Database };

function configureNeonHttpTransport(host: string) {
  neonConfig.fetchEndpoint = (hostname) => neonHttpSqlEndpoint(hostname || host);
  // Do not override fetchFunction: a strict wrapper rejected non-https shapes
  // (empty Request.url on some Vercel runtimes) and surfaced as Failed query / Invalid URL.
}

export function getDb(): Database {
  if (globalForDb.cmsDb) return globalForDb.cmsDb;

  const rawDiagnosis = diagnoseDatabaseUrl(process.env.DATABASE_URL);
  console.info(`[db] raw DATABASE_URL ${formatDatabaseUrlDiagnosis(rawDiagnosis)}`);

  const { url, source, diagnosis } = resolveDatabaseUrl(process.env);
  const params = toNeonConnectionParams(url);

  configureNeonHttpTransport(params.host);

  console.info(
    `[db] using ${source} host=${params.host} db=${params.database} endpoint=${neonHttpSqlEndpoint(params.host)} (${formatDatabaseUrlDiagnosis(
      {
        ...diagnosis,
        source,
      }
    )})`
  );

  try {
    const sql = neon({
      host: params.host,
      user: params.user,
      password: params.password,
      database: params.database,
    });
    const database = drizzle(sql, { schema });
    globalForDb.cmsDb = database;
    return database;
  } catch (error) {
    throw new Error(
      `Neon-Client Init fehlgeschlagen. (${formatDatabaseUrlDiagnosis({
        ...diagnosis,
        source,
      })}) ${summarizeDbError(error)}`
    );
  }
}
