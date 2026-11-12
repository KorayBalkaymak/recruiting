import { redirect } from "next/navigation";
import { count, eq } from "drizzle-orm";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { canManageUsers, getSessionCandidate, getSessionStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db";
import { vacancies } from "@/lib/db/schema";
import { isDemoMode } from "@/lib/demo/mode";

/** Avoid build-time prerender requiring DATABASE_URL on Vercel. */
export const dynamic = "force-dynamic";

async function getOpenRequestsCount() {
  if (isDemoMode()) {
    const supabase = createClient();
    const { count: openRequestsCount } = await supabase
      .from("vacancies")
      .select("id", { count: "exact", head: true })
      .eq("status", "neue_anfrage");
    return openRequestsCount ?? 0;
  }

  const [row] = await getDb()
    .select({ n: count() })
    .from(vacancies)
    .where(eq(vacancies.status, "neue_anfrage"));
  return Number(row?.n ?? 0);
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const candidate = await getSessionCandidate();
  if (candidate) {
    redirect("/candidate/dashboard");
  }

  const staff = await getSessionStaff();
  if (!staff) {
    redirect("/login");
  }

  const openRequestsCount = await getOpenRequestsCount();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        openRequestsCount={openRequestsCount}
        canManageUsers={canManageUsers(staff.role)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          currentUser={{
            fullName: staff.fullName,
            email: staff.email,
            role: staff.role,
          }}
        />
        <main className="scrollbar-thin flex-1 overflow-y-auto bg-surface-subtle p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
