"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db";
import { candidates } from "@/lib/db/schema";
import { insertActivityLog } from "@/lib/db/crm";
import { isDemoMode } from "@/lib/demo/mode";
import type { AnonymizedProfile } from "@/lib/candidate-profile";
import type { CandidateStatus } from "@/types/supabase";
import { requireStaff } from "@/lib/auth";

export async function updateCandidateStatus(candidateId: string, status: CandidateStatus) {
  const staff = await requireStaff();

  if (isDemoMode()) {
    const supabase = createClient();
    const { error } = await supabase.from("candidates").update({ status }).eq("id", candidateId);
    if (error) throw error;

    await supabase.from("activity_logs").insert({
      entity_type: "candidate",
      entity_id: candidateId,
      type: "statusaenderung",
      content: `Status geändert auf „${status}“.`,
      created_by: staff.id,
    });
  } else {
    const db = getDb();
    await db
      .update(candidates)
      .set({ status, updatedAt: new Date() })
      .where(eq(candidates.id, candidateId));
    await insertActivityLog({
      entityType: "candidate",
      entityId: candidateId,
      type: "statusaenderung",
      content: `Status geändert auf „${status}“.`,
      createdBy: staff.id,
    });
  }

  revalidatePath("/kandidaten");
  revalidatePath(`/kandidaten/${candidateId}`);
}

export async function saveAnonymizedProfile(
  candidateId: string,
  title: string,
  profile: AnonymizedProfile
) {
  await requireStaff();

  if (isDemoMode()) {
    const supabase = createClient();
    const { error } = await supabase
      .from("candidates")
      .update({ anonymized_title: title, anonymized_profile: profile })
      .eq("id", candidateId);
    if (error) throw error;
  } else {
    await getDb()
      .update(candidates)
      .set({
        anonymizedTitle: title,
        anonymizedProfile: profile as Record<string, unknown>,
        updatedAt: new Date(),
      })
      .where(eq(candidates.id, candidateId));
  }

  revalidatePath(`/kandidaten/${candidateId}`);
}
