import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { resolveDatabaseUrl } from "@/lib/db/database-url";
import * as schema from "@/lib/db/schema";
import { isDemoMode } from "@/lib/demo/mode";
import { isCandidateSignup } from "./candidate-context";
import { isInternalInvite } from "./invite-context";
import { CANDIDATE_ROLE, isInternalRole, type InternalRole } from "./roles";
import { buildCandidateProvisionPlan } from "./provision-candidate";
import { deliverPasswordSetupEmail } from "@/lib/mail/send";
import { PASSWORD_TOKEN_TTL_SECONDS } from "@/lib/mail/secure-token";

function normalizeAppBaseUrl(raw: string): string {
  let value = raw.replace(/^\uFEFF/, "").trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  if (!/^https?:\/\//i.test(value)) {
    throw new Error(
      "BETTER_AUTH_URL/NEXT_PUBLIC_APP_URL muss mit http:// oder https:// beginnen (ohne Anführungszeichen)."
    );
  }
  try {
    return new URL(value).origin;
  } catch {
    throw new Error("BETTER_AUTH_URL/NEXT_PUBLIC_APP_URL ist keine gültige URL.");
  }
}

function requireAuthEnv() {
  const secret = process.env.BETTER_AUTH_SECRET;
  const rawBaseURL = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (!secret || secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET fehlt oder ist zu kurz (mind. 32 Zeichen).");
  }
  if (!rawBaseURL) {
    throw new Error("BETTER_AUTH_URL oder NEXT_PUBLIC_APP_URL muss gesetzt sein.");
  }
  const baseURL = normalizeAppBaseUrl(rawBaseURL);
  // Validates / strips quotes; also accepts Vercel Neon POSTGRES_URL fallbacks.
  resolveDatabaseUrl(process.env);
  return { secret, baseURL };
}

let authInstance: ReturnType<typeof createAuth> | null = null;

/**
 * Creates all candidate domain rows in one Neon HTTP batch transaction.
 * Client-generated candidate UUID keeps inserts independent within the batch.
 * (drizzle neon-http `.transaction()` is unsupported; `.batch()` uses neon SQL transaction.)
 */
export async function provisionCandidateAccount(user: {
  id: string;
  name: string;
  email: string;
}) {
  const db = getDb();
  const plan = buildCandidateProvisionPlan(user);

  await db.batch([
    db.insert(schema.candidates).values({
      id: plan.candidateId,
      firstName: plan.firstName,
      lastName: plan.lastName,
      email: plan.email,
      status: "neu_eingegangen",
    }),
    db.insert(schema.candidateAccounts).values({
      id: plan.accountId,
      candidateId: plan.candidateId,
    }),
    db.insert(schema.candidateSearchProfiles).values({
      candidateId: plan.candidateId,
      country: "Deutschland",
    }),
    db.insert(schema.candidatePortalProfiles).values({
      candidateId: plan.candidateId,
      status: "draft",
    }),
    db.insert(schema.candidateProfileReviewEvents).values({
      candidateId: plan.candidateId,
      actorCandidateAccountId: plan.accountId,
      fromStatus: null,
      toStatus: "draft",
      note: "Profil angelegt",
    }),
  ]);
}

function createAuth() {
  const { secret, baseURL } = requireAuthEnv();
  const db = getDb();

  return betterAuth({
    appName: "CMS Recruiting-Plattform",
    baseURL,
    secret,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: schema.authUser,
        session: schema.authSession,
        account: schema.authAccount,
        verification: schema.authVerification,
      },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      /**
       * Official Better Auth option (1.7.x). Prevents signUpEmail from creating
       * a session / Set-Cookie so invite flows cannot replace the admin session.
       * Candidate register signs in explicitly afterwards.
       */
      autoSignIn: false,
      revokeSessionsOnPasswordReset: true,
      /** Better Auth default is 3600s; explicit for invite + forgot-password links. */
      resetPasswordTokenExpiresIn: PASSWORD_TOKEN_TTL_SECONDS,
      sendResetPassword: async ({ user, url, token }) => {
        await deliverPasswordSetupEmail({ user, url, token });
      },
    },
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: false,
          defaultValue: "recruiter",
          input: false,
        },
      },
    },
    /**
     * Signed session_data cookie so Edge middleware can resolve role without
     * cookie-presence-only checks. Authoritative get-session remains fallback.
     */
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
    },
    advanced: {
      database: {
        generateId: () => crypto.randomUUID(),
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            if (isCandidateSignup()) {
              return {
                data: {
                  ...user,
                  role: CANDIDATE_ROLE,
                },
              };
            }
            if (isInternalInvite()) {
              return { data: user };
            }
            throw new Error("Öffentliche Registrierung ist nur für Kandidaten freigeschaltet.");
          },
          after: async (user) => {
            if (isCandidateSignup() || user.role === CANDIDATE_ROLE) {
              await provisionCandidateAccount(user);
              return;
            }
            const role: InternalRole = isInternalRole(user.role) ? user.role : "recruiter";
            await db.insert(schema.profiles).values({
              id: user.id,
              fullName: user.name,
              email: user.email,
              role,
            });
          },
        },
      },
    },
    plugins: [nextCookies()],
  });
}

export function getAuth() {
  if (isDemoMode()) {
    throw new Error("Better Auth ist im Demo-Modus nicht aktiv.");
  }
  if (!authInstance) {
    authInstance = createAuth();
  }
  return authInstance;
}

export async function syncAuthUserRole(userId: string, role: InternalRole) {
  const db = getDb();
  await db.update(schema.authUser).set({ role, updatedAt: new Date() }).where(eq(schema.authUser.id, userId));
}
