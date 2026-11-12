import "server-only";

import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import {
  classifyUrlShape,
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
  // Function form only — never assign the postgres URI (or any env value) to fetchEndpoint.
  neonConfig.fetchEndpoint = (hostname) => neonHttpSqlEndpoint(hostname || host);

  neonConfig.fetchFunction = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const shape = classifyUrlShape(url);
    if (shape !== "https") {
      throw new Error(
        `[db] Neon HTTP-Endpoint abgelehnt (shape=${shape}, len=${url?.length ?? 0}). Erwartet https://api…/sql.`
      );
    }
    try {
      return await fetch(input, init);
    } catch (error) {
      throw new Error(`[db] Neon fetch fehlgeschlagen. ${summarizeDbError(error)}`);
    }
  };
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
    // Discrete params — connection string never becomes the HTTP fetch URL.
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
