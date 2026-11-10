import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";
import { isDemoMode } from "@/lib/demo/mode";

/**
 * Browser Supabase client — demo-only compatibility shim.
 * Live CRM/auth must not use this; there are currently no app imports.
 */
export function createClient() {
  if (!isDemoMode()) {
    throw new Error(
      "lib/supabase/client createClient() ist im Live-Modus nicht verfügbar. Live nutzt Neon/Better Auth."
    );
  }

  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
