import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: { full_name: string; email: string; role: string } | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, email, role")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  const { count: openRequestsCount } = await supabase
    .from("vacancies")
    .select("id", { count: "exact", head: true })
    .eq("status", "neue_anfrage");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar openRequestsCount={openRequestsCount ?? 0} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          currentUser={
            profile
              ? { fullName: profile.full_name, email: profile.email, role: profile.role }
              : null
          }
        />
        <main className="scrollbar-thin flex-1 overflow-y-auto bg-surface-subtle p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
