"use server";

import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { isDemoMode } from "@/lib/demo/mode";
import { RATE_LIMITS, enforceRateLimit, rateLimitKey } from "@/lib/security/rate-limit";
import { getRequestClientIp } from "@/lib/security/request-ip";

function appBaseUrl() {
  const baseURL = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (!baseURL) {
    throw new Error("BETTER_AUTH_URL oder NEXT_PUBLIC_APP_URL muss gesetzt sein.");
  }
  return baseURL.replace(/\/$/, "");
}

/**
 * Always returns the same success copy (no account enumeration).
 * Demo: no Better Auth / no outbound mail.
 */
function forgotPasswordPath(params: { error?: string; message?: string; from?: string }) {
  const qs = new URLSearchParams();
  if (params.from === "candidate") qs.set("from", "candidate");
  if (params.error) qs.set("error", params.error);
  if (params.message) qs.set("message", params.message);
  const query = qs.toString();
  return query ? `/login/forgot-password?${query}` : "/login/forgot-password";
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const from = String(formData.get("from") ?? "").trim();
  const fromCandidate = from === "candidate" ? "candidate" : undefined;
  const genericSuccess =
    "Wenn ein Konto mit dieser E-Mail existiert, wurde ein Link zum Zurücksetzen gesendet.";

  if (!email) {
    redirect(
      forgotPasswordPath({
        from: fromCandidate,
        error: "E-Mail-Adresse ist erforderlich.",
      })
    );
  }

  const limit = await enforceRateLimit(
    rateLimitKey({ action: "password_reset", ip: getRequestClientIp(), email }),
    RATE_LIMITS.passwordReset
  );
  if (!limit.ok) {
    // Same success copy — do not confirm whether the account exists or was throttled.
    redirect(forgotPasswordPath({ from: fromCandidate, message: genericSuccess }));
  }

  if (isDemoMode()) {
    redirect(forgotPasswordPath({ from: fromCandidate, message: genericSuccess }));
  }

  try {
    await getAuth().api.requestPasswordReset({
      body: {
        email,
        redirectTo: `${appBaseUrl()}/login/set-password`,
      },
    });
  } catch {
    // Soft-fail: identical UX whether user missing, mail unavailable, or provider error.
  }

  redirect(forgotPasswordPath({ from: fromCandidate, message: genericSuccess }));
}
