"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDb } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import {
  assertStaffProfileForRoleChange,
  getAuth,
  isInternalRole,
  requireUserManager,
  runAsInternalInvite,
  syncAuthUserRole,
  toSafeAuthMessage,
  type InternalRole,
} from "@/lib/auth";
import { assertUserManagerActor } from "@/lib/auth/actor-binding";
import { isDemoMode } from "@/lib/demo/mode";

export type InviteUserResult = {
  status: "created" | "created_pending_password_setup";
};

function assertRole(role: string): InternalRole {
  if (!isInternalRole(role)) {
    throw new Error("Ungültige Rolle.");
  }
  return role;
}

function inviteAppBaseUrl() {
  const baseURL = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (!baseURL) {
    throw new Error("BETTER_AUTH_URL oder NEXT_PUBLIC_APP_URL muss gesetzt sein.");
  }
  return baseURL.replace(/\/$/, "");
}

function createUnusableInvitePassword() {
  // Cryptographically random, never returned, logged, or stored in plaintext outside Better Auth's hash.
  return `Inv-${crypto.randomUUID()}-${crypto.randomUUID()}!Aa1`;
}

/**
 * Role changes are staff-only. Validates an internal profile exists before any write.
 * Never touches candidate auth roles via this path.
 */
export async function updateUserRole(userId: string, role: string) {
  assertUserManagerActor(await requireUserManager());
  const nextRole = assertRole(role);
  const targetId = userId.trim();
  if (!targetId) {
    throw new Error("Ungültige Nutzer-ID.");
  }

  if (isDemoMode()) {
    const { findDemoUserById } = await import("@/lib/demo/store");
    const demoUser = findDemoUserById(targetId);
    assertStaffProfileForRoleChange(
      demoUser ? { id: demoUser.id, role: demoUser.role } : null
    );
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ role: nextRole }).eq("id", targetId);
    if (error) throw error;
    revalidatePath("/nutzerverwaltung");
    return;
  }

  const db = getDb();
  const [existing] = await db
    .select({ id: profiles.id, role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, targetId))
    .limit(1);

  assertStaffProfileForRoleChange(existing);

  const [updated] = await db
    .update(profiles)
    .set({ role: nextRole, updatedAt: new Date() })
    .where(eq(profiles.id, targetId))
    .returning({ id: profiles.id });

  if (!updated) {
    throw new Error("Kein internes Nutzerprofil gefunden.");
  }

  await syncAuthUserRole(targetId, nextRole);
  revalidatePath("/nutzerverwaltung");
}

export async function inviteUser(email: string, fullName: string, role: string): Promise<InviteUserResult> {
  assertUserManagerActor(await requireUserManager());
  const nextRole = assertRole(role);
  const normalizedEmail = email.trim().toLowerCase();
  const name = fullName.trim();

  if (!normalizedEmail || !name) {
    throw new Error("Name und E-Mail sind erforderlich.");
  }

  if (isDemoMode()) {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
      throw new Error(
        "Einladungen erfordern den SUPABASE_SERVICE_ROLE_KEY in .env.local (nur serverseitig)."
      );
    }
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.inviteUserByEmail(normalizedEmail);
    if (error) throw error;
    if (data.user) {
      await admin.from("profiles").insert({
        id: data.user.id,
        full_name: name,
        email: normalizedEmail,
        role: nextRole,
      });
    }
    revalidatePath("/nutzerverwaltung");
    return { status: "created" };
  }

  const { hasResendConfig } = await import("@/lib/mail/config");
  if (!hasResendConfig()) {
    throw new Error(
      "E-Mail-Versand ist nicht konfiguriert (RESEND_API_KEY / EMAIL_FROM). Einladung abgebrochen."
    );
  }

  try {
    await runAsInternalInvite(async () => {
      const temporaryPassword = createUnusableInvitePassword();
      await getAuth().api.signUpEmail({
        body: {
          email: normalizedEmail,
          password: temporaryPassword,
          name,
        },
      });
    });

    const [created] = await getDb()
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.email, normalizedEmail))
      .limit(1);

    if (created) {
      await getDb()
        .update(profiles)
        .set({ role: nextRole, fullName: name, updatedAt: new Date() })
        .where(eq(profiles.id, created.id));
      await syncAuthUserRole(created.id, nextRole);
    }

    // Creates a Better Auth reset-password verification token and invokes sendResetPassword.
    // Keep invite ALS so the mailer uses the staff-invite template (not generic reset).
    // With autoSignIn: false, no session cookie is set for the invited user.
    await runAsInternalInvite(async () => {
      await getAuth().api.requestPasswordReset({
        body: {
          email: normalizedEmail,
          redirectTo: `${inviteAppBaseUrl()}/login/set-password`,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && /E-Mail-Versand/i.test(error.message)) {
      throw error;
    }
    throw new Error(toSafeAuthMessage(error));
  }

  revalidatePath("/nutzerverwaltung");
  return { status: "created_pending_password_setup" };
}
