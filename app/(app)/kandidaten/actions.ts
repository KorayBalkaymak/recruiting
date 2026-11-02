"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AnonymizedProfile } from "@/lib/candidate-profile";
import type { CandidateStatus } from "@/types/supabase";

export async function updateCandidateStatus(candidateId: string, status: CandidateStatus) {
  const supabase = createClient();
  const { error } = await supabase.from("candidates").update({ status }).eq("id", candidateId);
  if (error) throw error;

  await supabase.from("activity_logs").insert({
    entity_type: "candidate",
    entity_id: candidateId,
    type: "statusaenderung",
    content: `Status geändert auf „${status}“.`,
    created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
  });

  revalidatePath("/kandidaten");
  revalidatePath(`/kandidaten/${candidateId}`);
}

export async function saveAnonymizedProfile(
  candidateId: string,
  title: string,
  profile: AnonymizedProfile
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("candidates")
    .update({ anonymized_title: title, anonymized_profile: profile })
    .eq("id", candidateId);

  if (error) throw error;

  revalidatePath(`/kandidaten/${candidateId}`);
}
