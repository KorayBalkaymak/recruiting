"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  getAuth,
  requireCandidate,
  runAsCandidateSignup,
  toSafeAuthMessage,
} from "@/lib/auth";
import { DEMO_CANDIDATE_COOKIE, isDemoMode } from "@/lib/demo/mode";
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
    await getAuth().api.signInEmail({
      body: { email, password },
    });
  } catch (error) {
    redirect(`/candidate/register?error=${encodeURIComponent(toSafeAuthMessage(error))}`);
  }

  redirect("/candidate/dashboard");
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
    await setDemoCandidateCookie(account.accountId);
    redirect("/candidate/dashboard");
  }

  try {
    await getAuth().api.signInEmail({
      body: { email, password },
    });
  } catch (error) {
    redirect(`/candidate/login?error=${encodeURIComponent(toSafeAuthMessage(error))}`);
  }

  redirect("/candidate/dashboard");
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

export async function submitProfileAction() {
  const candidate = await requireCandidate();
  await submitCandidateProfile(candidate);
}
