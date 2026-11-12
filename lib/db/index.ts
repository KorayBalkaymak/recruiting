import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { resolveDatabaseUrl } from "./database-url";
import * as schema from "./schema";

export type Database = NeonHttpDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { cmsDb?: Database };

export function getDb(): Database {
  if (globalForDb.cmsDb) return globalForDb.cmsDb;

  const { url, source, diagnosis } = resolveDatabaseUrl(process.env);
  // Safe shape only — never log the connection string itself.
  console.info(
    `[db] using ${source} (${[
      `wrapper=${diagnosis.wrapper}`,
      `schemeOk=${diagnosis.schemeOk}`,
      `neonParseOk=${diagnosis.neonParseOk}`,
      `fixedByUserinfoEncoding=${diagnosis.fixedByUserinfoEncoding}`,
      `hasHost=${diagnosis.hasHost}`,
      `len=${diagnosis.length}`,
    ].join(" ")})`
  );
  const database = drizzle(neon(url), { schema });
  globalForDb.cmsDb = database;
  return database;
}
