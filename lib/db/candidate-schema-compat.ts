import "server-only";

import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";

const globalForCompat = globalThis as unknown as { cmsCandidateClaimCols?: boolean };

function rowsOf(result: unknown): unknown[] {
  if (Array.isArray(result)) return result;
  if (result && typeof result === "object" && "rows" in result) {
    return (result as { rows: unknown[] }).rows ?? [];
  }
  return [];
}

/** Production may lag migration 0003 (claimed_by / last_recruiter_action_at). */
export async function candidatesHaveClaimColumns(): Promise<boolean> {
  if (typeof globalForCompat.cmsCandidateClaimCols === "boolean") {
    return globalForCompat.cmsCandidateClaimCols;
  }
  const result = await getDb().execute(sql`
    select 1 as ok
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'candidates'
      and column_name = 'claimed_by_profile_id'
    limit 1
  `);
  const present = rowsOf(result).length > 0;
  globalForCompat.cmsCandidateClaimCols = present;
  return present;
}
