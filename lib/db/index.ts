import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { normalizeDatabaseUrl } from "./database-url";
import * as schema from "./schema";

export type Database = NeonHttpDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { cmsDb?: Database };

export function getDb(): Database {
  if (globalForDb.cmsDb) return globalForDb.cmsDb;

  const url = normalizeDatabaseUrl(process.env.DATABASE_URL);
  const database = drizzle(neon(url), { schema });
  globalForDb.cmsDb = database;
  return database;
}
