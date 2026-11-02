import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/supabase";
import { createDemoClient } from "@/lib/demo/client";
import { isDemoMode } from "@/lib/demo/mode";

export function createClient() {
  if (isDemoMode()) {
    return createDemoClient() as ReturnType<typeof createServerClient<Database>>;
  }

  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // set() aufgerufen aus einer Server Component — kann ignoriert werden,
            // sofern Middleware die Session refresht.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // siehe oben
          }
        },
      },
    }
  );
}
