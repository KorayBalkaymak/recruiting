"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db";
import { companies } from "@/lib/db/schema";
import { insertActivityLog } from "@/lib/db/crm";
import { isDemoMode } from "@/lib/demo/mode";
import type { CompanyInactiveReason, CompanyStatus } from "@/types/supabase";
import { requireStaff } from "@/lib/auth";

export async function updateCompanyStatus(
  companyId: string,
  status: CompanyStatus,
  inactiveReason?: CompanyInactiveReason
) {
  const staff = await requireStaff();
  if (status === "inaktiv" && !inactiveReason) {
    throw new Error("Bitte einen Grund für die Inaktivität auswählen.");
  }

  if (isDemoMode()) {
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

    await supabase.from("activity_logs").insert({
      entity_type: "company",
      entity_id: companyId,
      type: "statusaenderung",
      content:
        status === "inaktiv"
          ? `Status auf „Inaktiv“ gesetzt (Grund: ${inactiveReason}).`
          : `Status geändert auf „${status}“.`,
      created_by: staff.id,
    });
  } else {
    const db = getDb();
    await db
      .update(companies)
      .set({
        status,
        inactiveReason: status === "inaktiv" ? inactiveReason : null,
        inactiveSince: status === "inaktiv" ? new Date().toISOString().slice(0, 10) : null,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, companyId));

    await insertActivityLog({
      entityType: "company",
      entityId: companyId,
      type: "statusaenderung",
      content:
        status === "inaktiv"
          ? `Status auf „Inaktiv“ gesetzt (Grund: ${inactiveReason}).`
          : `Status geändert auf „${status}“.`,
      createdBy: staff.id,
    });
  }

  revalidatePath("/kunden");
}

export async function addCompanyNote(companyId: string, note: string) {
  const staff = await requireStaff();
  if (!note.trim()) return;

  if (isDemoMode()) {
    const supabase = createClient();
    const { error } = await supabase.from("activity_logs").insert({
      entity_type: "company",
      entity_id: companyId,
      type: "notiz",
      content: note.trim(),
      created_by: staff.id,
    });
    if (error) throw error;
    await supabase
      .from("companies")
      .update({ last_contact_at: new Date().toISOString() })
      .eq("id", companyId);
  } else {
    await insertActivityLog({
      entityType: "company",
      entityId: companyId,
      type: "notiz",
      content: note.trim(),
      createdBy: staff.id,
    });
    await getDb()
      .update(companies)
      .set({ lastContactAt: new Date(), updatedAt: new Date() })
      .where(eq(companies.id, companyId));
  }

  revalidatePath("/kunden");
}
