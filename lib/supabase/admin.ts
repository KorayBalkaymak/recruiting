import { createDemoClient } from "@/lib/demo/client";
import { isDemoMode } from "@/lib/demo/mode";

// ACHTUNG: Nur in Server Actions / Route Handlers verwenden, niemals im Client-Bundle.
// Demo-only — Live-Nutzerverwaltung läuft über Better Auth + Neon.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createAdminClient(): any {
  if (isDemoMode()) {
    return createDemoClient();
  }

  throw new Error(
    "createAdminClient() ist im Live-Modus nicht verfügbar. Nutzerverwaltung läuft über Better Auth + Neon."
  );
}
