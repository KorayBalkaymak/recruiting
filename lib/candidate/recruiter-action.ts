import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { candidates } from "@/lib/db/schema";
import { isDemoMode } from "@/lib/demo/mode";
import { getDemoStore } from "@/lib/demo/store";

export async function markCandidateRecruiterAction(candidateId: string, at = new Date()) {
  if (isDemoMode()) {
    const row = getDemoStore().candidates.find((candidate) => candidate.id === candidateId) as
      | Record<string, unknown>
      | undefined;
    if (row) row.last_recruiter_action_at = at.toISOString();
    return;
  }

  const { candidatesHaveClaimColumns } = await import("@/lib/db/candidate-schema-compat");
  if (!(await candidatesHaveClaimColumns())) return;

  await getDb()
    .update(candidates)
    .set({ lastRecruiterActionAt: at })
    .where(eq(candidates.id, candidateId));
}
