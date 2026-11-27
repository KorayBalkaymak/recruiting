"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect";
import {
  CANDIDATE_VERIFY_EMAIL_PATH,
  decideCandidateLoginAccess,
  getAuth,
  isDuplicateSignupError,
  requireCandidate,
  runAsCandidateSignup,
  summarizeAuthError,
  toSafeAuthMessage,
} from "@/lib/auth";
import { DEMO_CANDIDATE_COOKIE, DEMO_COOKIE, isDemoMode } from "@/lib/demo/mode";
import { demoStaffCookieOptions } from "@/lib/demo/staff-session";
import {
  createDemoCandidateSessionToken,
  demoCandidateCookieOptions,
} from "@/lib/demo/candidate-session";
import {
  findDemoCandidateByEmail,
  registerDemoCandidate,
} from "@/lib/demo/candidate-portal";
import { saveCandidateDraft, submitCandidateProfile, type ProfileSaveInput } from "@/lib/candidate/portal-service";

async function setDemoCandidateCookie(accountId: string) {
  const token = await createDemoCandidateSessionToken(accountId);
  cookies().set({
    name: DEMO_CANDIDATE_COOKIE,
    value: token,
    ...demoCandidateCookieOptions(),
  });
}

function clearDemoCandidateCookie() {
  cookies().set({
    name: DEMO_CANDIDATE_COOKIE,
    value: "",
    ...demoCandidateCookieOptions(0),
    maxAge: 0,
  });
}

function clearDemoStaffCookie() {
  cookies().set({
    name: DEMO_COOKIE,
    value: "",
    ...demoStaffCookieOptions(0),
    maxAge: 0,
  });
}

async function clearExistingAuthSession() {
  try {
    const current = await getAuth().api.getSession({ headers: headers() });
    if (current?.user) {
      await getAuth().api.signOut({ headers: headers() });
    }
  } catch {
    // No usable session, or Better Auth is unavailable.
  }
}

export async function candidateRegisterAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();

  if (!email || !password || !fullName) {
    redirect(
      `/candidate/register?error=${encodeURIComponent("Name, E-Mail und Passwort sind erforderlich.")}`
    );
  }
  if (password.length < 8) {
    redirect(
      `/candidate/register?error=${encodeURIComponent("Passwort muss mindestens 8 Zeichen haben.")}`
    );
  }

  const { RATE_LIMITS, enforceRateLimit, rateLimitKey } = await import("@/lib/security/rate-limit");
  const { getRequestClientIp } = await import("@/lib/security/request-ip");
  const limit = await enforceRateLimit(
    rateLimitKey({ action: "candidate_register", ip: getRequestClientIp(), email }),
    RATE_LIMITS.register
  );
  if (!limit.ok) {
    redirect(
      `/candidate/register?error=${encodeURIComponent(
        `Zu viele Registrierungsversuche. Bitte in ${limit.retryAfterSeconds}s erneut versuchen.`
      )}`
    );
  }

  if (isDemoMode()) {
    try {
      const account = registerDemoCandidate({ email, password, fullName });
      clearDemoStaffCookie();
      await setDemoCandidateCookie(account.accountId);
    } catch (error) {
      redirect(
        `/candidate/register?error=${encodeURIComponent(
          error instanceof Error ? error.message : "Registrierung fehlgeschlagen."
        )}`
      );
    }
    redirect("/candidate/dashboard");
  }

  try {
    await runAsCandidateSignup(async () => {
      await getAuth().api.signUpEmail({
        body: {
          email,
          password,
          name: fullName,
        },
      });
    });
    await getAuth().api.sendVerificationEmail({
      body: {
        email,
        callbackURL: CANDIDATE_VERIFY_EMAIL_PATH,
      },
    });
  } catch (error) {
    if (isDuplicateSignupError(error)) {
      redirect(CANDIDATE_VERIFY_EMAIL_PATH);
    }
    console.error(`[auth] candidate register failed ${summarizeAuthError(error)}`);
    redirect(`/candidate/register?error=${encodeURIComponent(toSafeAuthMessage(error))}`);
  }

  redirect(CANDIDATE_VERIFY_EMAIL_PATH);
}

export async function candidateLoginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(
      `/candidate/login?error=${encodeURIComponent("E-Mail und Passwort sind erforderlich.")}`
    );
  }

  const { RATE_LIMITS, enforceRateLimit, rateLimitKey } = await import("@/lib/security/rate-limit");
  const { getRequestClientIp } = await import("@/lib/security/request-ip");
  const limit = await enforceRateLimit(
    rateLimitKey({ action: "candidate_login", ip: getRequestClientIp(), email }),
    RATE_LIMITS.login
  );
  if (!limit.ok) {
    redirect(
      `/candidate/login?error=${encodeURIComponent(
        `Zu viele Anmeldeversuche. Bitte in ${limit.retryAfterSeconds}s erneut versuchen.`
      )}`
    );
  }

  if (isDemoMode()) {
    const account = findDemoCandidateByEmail(email, password);
    if (!account) {
      redirect(`/candidate/login?error=${encodeURIComponent("Ungültige Anmeldedaten")}`);
    }
    clearDemoStaffCookie();
    await setDemoCandidateCookie(account.accountId);
    redirect("/candidate/dashboard");
  }

  await clearExistingAuthSession();

  let user: { role?: unknown; emailVerified?: unknown } | undefined;
  try {
    const signedIn = await getAuth().api.signInEmail({
      body: { email, password },
      headers: headers(),
    });
    user = signedIn?.user as { role?: unknown; emailVerified?: unknown } | undefined;
  } catch (error) {
    console.error(`[auth] candidate login failed ${summarizeAuthError(error)}`);
    redirect(`/candidate/login?error=${encodeURIComponent(toSafeAuthMessage(error))}`);
  }

  const decision = decideCandidateLoginAccess(user);
  if (decision !== "authenticated") {
    try {
      await getAuth().api.signOut({ headers: headers() });
    } catch {
      // ignore
    }
    if (decision === "unverified") {
      redirect(CANDIDATE_VERIFY_EMAIL_PATH);
    }
    redirect(`/candidate/login?error=${encodeURIComponent("Ungültige Anmeldedaten.")}`);
  }

  redirect("/candidate/dashboard");
}

export async function candidateResendVerificationAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  const { RATE_LIMITS, enforceRateLimit, rateLimitKey } = await import("@/lib/security/rate-limit");
  const { getRequestClientIp } = await import("@/lib/security/request-ip");
  const limit = await enforceRateLimit(
    rateLimitKey({ action: "candidate_verify_email", ip: getRequestClientIp(), email }),
    RATE_LIMITS.verifyEmail
  );
  if (!limit.ok) {
    redirect(
      `${CANDIDATE_VERIFY_EMAIL_PATH}?status=resent`
    );
  }

  if (!email) {
    redirect(CANDIDATE_VERIFY_EMAIL_PATH);
  }

  if (isDemoMode()) {
    redirect(`${CANDIDATE_VERIFY_EMAIL_PATH}?status=resent`);
  }

  try {
    await getAuth().api.sendVerificationEmail({
      body: {
        email,
        callbackURL: CANDIDATE_VERIFY_EMAIL_PATH,
      },
    });
  } catch (error) {
    console.error(`[auth] candidate verify resend failed ${summarizeAuthError(error)}`);
  }

  redirect(`${CANDIDATE_VERIFY_EMAIL_PATH}?status=resent`);
}

export async function candidateLogoutAction() {
  if (isDemoMode()) {
    clearDemoCandidateCookie();
    redirect("/candidate/login");
  }

  try {
    await getAuth().api.signOut({
      headers: await import("next/headers").then((m) => m.headers()),
    });
  } catch {
    // Session kann bereits ungültig sein.
  }
  redirect("/candidate/login");
}

export async function saveProfileDraftAction(input: ProfileSaveInput) {
  const candidate = await requireCandidate();
  await saveCandidateDraft(candidate, input);
}

export async function submitProfileAction(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const candidate = await requireCandidate();
    await submitCandidateProfile(candidate);
    revalidatePath("/candidate/dashboard");
    revalidatePath("/candidate/profile");
    revalidatePath("/candidate/status");
    revalidatePath("/portal-pruefungen");
    revalidatePath("/uebersicht");
    return { ok: true };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return {
      ok: false,
      error: error instanceof Error && error.message ? error.message : "Einreichung fehlgeschlagen.",
    };
  }
}
