import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { isDemoMode } from "@/lib/demo/mode";
import { UserTable } from "@/components/nutzerverwaltung/user-table";
import { InviteUserForm } from "@/components/nutzerverwaltung/invite-user-form";
import { AuthError, requireUserManager } from "@/lib/auth";

async function getUsers() {
  if (isDemoMode()) {
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .order("full_name");
    return data ?? [];
  }

  const rows = await getDb()
    .select({
      id: profiles.id,
      fullName: profiles.fullName,
      email: profiles.email,
      role: profiles.role,
    })
    .from(profiles)
    .orderBy(asc(profiles.fullName));

  return rows.map((u) => ({
    id: u.id,
    full_name: u.fullName,
    email: u.email,
    role: u.role,
  }));
}

export default async function NutzerverwaltungPage() {
  try {
    await requireUserManager();
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/");
    }
    throw error;
  }

  const users = await getUsers();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Nutzerverwaltung</h1>
          <p className="text-sm text-ink-muted">Interne Nutzer und ihre Rollen verwalten.</p>
        </div>
        <InviteUserForm />
      </div>

      <div className="rounded-lg border border-surface-border bg-white shadow-panel">
        <UserTable users={users} />
      </div>
    </div>
  );
}
