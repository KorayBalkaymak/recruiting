/**
 * Create the first internal staff user (Better Auth + profiles).
 * Public signup is candidate-only; this uses the internal-invite hook.
 *
 *   BOOTSTRAP_STAFF_EMAIL=you@firma.de node --import ./scripts/mock-server-only-preload.mjs --import tsx scripts/bootstrap-staff.ts
 *
 * Optional: BOOTSTRAP_STAFF_PASSWORD, BOOTSTRAP_STAFF_NAME, BOOTSTRAP_STAFF_ROLE
 * Generated passwords are printed once (never stored in git).
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { getAuth, runAsInternalInvite, syncAuthUserRole } from "../lib/auth";
import { getDb } from "../lib/db";
import { profiles } from "../lib/db/schema";
import type { InternalRole } from "../lib/auth/roles";

function loadEnvLocal() {
  const file = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i);
    let v = t.slice(i + 1);
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (process.env[k] == null) process.env[k] = v;
  }
}

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name} fehlt.`);
  return v;
}

async function main() {
  loadEnvLocal();
  process.env.NEXT_PUBLIC_DEMO_MODE = "false";

  const email = requireEnv("BOOTSTRAP_STAFF_EMAIL").toLowerCase();
  const generated =
    !process.env.BOOTSTRAP_STAFF_PASSWORD?.trim()
      ? `${crypto.randomBytes(18).toString("base64url")}Aa1!`
      : null;
  const password = process.env.BOOTSTRAP_STAFF_PASSWORD?.trim() || generated!;
  const name = process.env.BOOTSTRAP_STAFF_NAME?.trim() || "Recruiter";
  const role = (process.env.BOOTSTRAP_STAFF_ROLE?.trim() || "admin") as InternalRole;
  const allowed: InternalRole[] = ["recruiter", "kam", "geschaeftsleitung", "admin"];
  if (!allowed.includes(role)) {
    throw new Error(`Ungültige Rolle: ${role}`);
  }
  if (password.length < 8) {
    throw new Error("BOOTSTRAP_STAFF_PASSWORD muss mind. 8 Zeichen haben.");
  }

  const db = getDb();
  const existing = await db
    .select({ email: profiles.email, role: profiles.role, id: profiles.id })
    .from(profiles);

  const same = existing.find((r) => String(r.email).toLowerCase() === email);
  if (same) {
    console.log(`EXISTS email=${email} role=${same.role}`);
    return;
  }

  await runAsInternalInvite(async () => {
    await getAuth().api.signUpEmail({
      body: { email, password, name },
    });
  });

  const [created] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.email, email))
    .limit(1);

  if (!created) {
    throw new Error("Profil nach Signup nicht gefunden.");
  }

  await db
    .update(profiles)
    .set({ role, fullName: name, updatedAt: new Date() })
    .where(eq(profiles.id, created.id));
  await syncAuthUserRole(created.id, role);

  console.log(`CREATED email=${email} role=${role} id=${created.id}`);
  if (generated) {
    console.log(`PASSWORD=${password}`);
  }
}

main().catch((error) => {
  console.error("FAIL", error instanceof Error ? error.message : "unknown");
  process.exit(1);
});
