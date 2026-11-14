"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuth, summarizeAuthError, toSafeAuthMessage } from "@/lib/auth";
import { isDemoMode } from "@/lib/demo/mode";
import { RATE_LIMITS, enforceRateLimit, rateLimitKey } from "@/lib/security/rate-limit";
import { getRequestClientIp } from "@/lib/security/request-ip";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(`/login?error=${encodeURIComponent("E-Mail und Passwort sind erforderlich.")}`);
  }

  const limit = await enforceRateLimit(
    rateLimitKey({ action: "staff_login", ip: getRequestClientIp(), email }),
    RATE_LIMITS.login
  );
  if (!limit.ok) {
    redirect(
      `/login?error=${encodeURIComponent(
        `Zu viele Anmeldeversuche. Bitte in ${limit.retryAfterSeconds}s erneut versuchen.`
      )}`
    );
  }

  if (isDemoMode()) {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      redirect(`/login?error=${encodeURIComponent("Ungültige Anmeldedaten")}`);
    }
    redirect("/");
  }

  try {
    const requestHeaders = headers();
    const originHost = (() => {
      const raw = requestHeaders.get("origin") || requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
      try {
        return raw ? new URL(raw.includes("://") ? raw : `https://${raw}`).hostname : "n/a";
      } catch {
        return "invalid";
      }
    })();
    console.info(`[auth] staff login origin_host=${originHost} vercel=${process.env.VERCEL ?? "0"}`);
    await getAuth().api.signInEmail({
      body: { email: email.toLowerCase(), password },
      headers: requestHeaders,
    });
  } catch (error) {
    console.error(`[auth] staff login failed ${summarizeAuthError(error)}`);
    redirect(`/login?error=${encodeURIComponent(toSafeAuthMessage(error))}`);
  }

  redirect("/");
}

export async function logoutAction() {
  if (isDemoMode()) {
    const supabase = createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  try {
    await getAuth().api.signOut({
      headers: await import("next/headers").then((m) => m.headers()),
    });
  } catch {
    // Session kann bereits ungültig sein.
  }
  redirect("/login");
}
