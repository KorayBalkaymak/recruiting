import { createClient } from "@/lib/supabase/server";
import { UserTable } from "@/components/nutzerverwaltung/user-table";
import { InviteUserForm } from "@/components/nutzerverwaltung/invite-user-form";

export default async function NutzerverwaltungPage() {
  const supabase = createClient();
  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .order("full_name");

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
        <UserTable users={users ?? []} />
      </div>
    </div>
  );
}
