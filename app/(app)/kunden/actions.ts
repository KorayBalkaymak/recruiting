"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CompanyInactiveReason, CompanyStatus } from "@/types/supabase";

export async function updateCompanyStatus(
  companyId: string,
  status: CompanyStatus,
  inactiveReason?: CompanyInactiveReason
) {
  if (status === "inaktiv" && !inactiveReason) {
    throw new Error("Bitte einen Grund für die Inaktivität auswählen.");
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("companies")
    .update({
      status,
      inactive_reason: status === "inaktiv" ? inactiveReason : null,
      inactive_since: status === "inaktiv" ? new Date().toISOString() : null,
    })
    .eq("id", companyId);

  if (error) throw error;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("activity_logs").insert({
    entity_type: "company",
    entity_id: companyId,
    type: "statusaenderung",
    content:
      status === "inaktiv"
        ? `Status auf „Inaktiv“ gesetzt (Grund: ${inactiveReason}).`
        : `Status geändert auf „${status}“.`,
    created_by: user?.id ?? null,
  });

  revalidatePath("/kunden");
}

export async function addCompanyNote(companyId: string, note: string) {
  if (!note.trim()) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("activity_logs").insert({
    entity_type: "company",
    entity_id: companyId,
    type: "notiz",
    content: note.trim(),
    created_by: user?.id ?? null,
  });

  if (error) throw error;

  await supabase.from("companies").update({ last_contact_at: new Date().toISOString() }).eq("id", companyId);

  revalidatePath("/kunden");
}
