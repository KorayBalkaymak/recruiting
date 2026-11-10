import { createDemoClient } from "@/lib/demo/client";
import { isDemoMode } from "@/lib/demo/mode";

/**
 * Demo-only data/auth adapter.
 * Live CRM uses Neon via getDb(); calling this outside demo mode is a hard error.
 *
 * Typed as `any` because the Row-only Database stub and the demo QueryBuilder
 * cannot express Insert/Update without collapsing to `never` / `unknown`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createClient(): any {
  if (isDemoMode()) {
    return createDemoClient();
  }

  throw new Error(
    "createClient() ist im Live-Modus nicht verfügbar. CRM-Daten laufen über Neon/Drizzle (getDb())."
  );
}
