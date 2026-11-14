import "server-only";

import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import {
  diagnoseConfiguredDatabaseUrl,
  formatDatabaseUrlDiagnosis,
  neonHttpSqlEndpoint,
  resolveDatabaseUrl,
  summarizeDbError,
  toNeonConnectionParams,
} from "./database-url";
import { neonNodeFetch } from "./neon-fetch";
import * as schema from "./schema";

neonConfig.fetchFunction = neonNodeFetch;

export type Database = NeonHttpDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { cmsDb?: Database };

export function getDb(): Database {
  if (globalForDb.cmsDb) return globalForDb.cmsDb;

  console.info(
    `[db] env ${formatDatabaseUrlDiagnosis(diagnoseConfiguredDatabaseUrl())}`
  );

  const { url, source, diagnosis } = resolveDatabaseUrl(process.env);
  const params = toNeonConnectionParams(url);

  console.info(
    `[db] using ${source} host=${params.host} db=${params.database} endpoint=${neonHttpSqlEndpoint(params.host)} (${formatDatabaseUrlDiagnosis(
      {
        ...diagnosis,
        source,
      }
    )})`
  );

  try {
    // Documented neon(connectionString) path. Discrete {host,user,...} still
    // starts from postgresql://- internally and previously surfaced as Invalid URL.
    const sql = neon(url);
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
