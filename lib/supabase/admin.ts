import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { createDemoClient } from "@/lib/demo/client";
import { isDemoMode } from "@/lib/demo/mode";

// ACHTUNG: Nur in Server Actions / Route Handlers verwenden, niemals im Client-Bundle.
// Der Service-Role-Key umgeht sämtliche RLS-Policies.
export function createAdminClient() {
  if (isDemoMode()) {
    return createDemoClient() as ReturnType<typeof createSupabaseClient<Database>>;
  }

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
