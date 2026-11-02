"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDemoMode } from "@/lib/demo/mode";
import type { UserRole } from "@/types/supabase";

export async function updateUserRole(userId: string, role: UserRole) {
  const supabase = createClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) throw error;
  revalidatePath("/nutzerverwaltung");
}

export async function inviteUser(email: string, fullName: string, role: UserRole) {
  if (!isDemoMode() && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Einladungen erfordern den SUPABASE_SERVICE_ROLE_KEY in .env.local (nur serverseitig)."
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email);
  if (error) throw error;

  if (data.user) {
    await admin.from("profiles").insert({
      id: data.user.id,
      full_name: fullName,
      email,
      role,
    });
  }

  revalidatePath("/nutzerverwaltung");
}
