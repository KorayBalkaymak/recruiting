"use server";

import { redirect } from "next/navigation";
import { getAuth, toSafeAuthMessage } from "@/lib/auth";
import { isDemoMode } from "@/lib/demo/mode";

export async function setPasswordAction(formData: FormData) {
  if (isDemoMode()) {
    redirect(
      `/login?error=${encodeURIComponent("Passwort setzen ist im Demo-Modus nicht verfügbar.")}`
    );
  }

  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!token) {
    redirect(`/login/set-password?error=${encodeURIComponent("Ungültiger oder fehlender Link.")}`);
  }
  if (!password || password.length < 8) {
    redirect(
      `/login/set-password?token=${encodeURIComponent(token)}&error=${encodeURIComponent("Passwort muss mindestens 8 Zeichen haben.")}`
    );
  }
  if (password !== confirm) {
    redirect(
      `/login/set-password?token=${encodeURIComponent(token)}&error=${encodeURIComponent("Passwörter stimmen nicht überein.")}`
    );
  }

  try {
    await getAuth().api.resetPassword({
      body: {
        newPassword: password,
        token,
      },
    });
  } catch (error) {
    redirect(
      `/login/set-password?token=${encodeURIComponent(token)}&error=${encodeURIComponent(toSafeAuthMessage(error))}`
    );
  }

  redirect(`/login?message=${encodeURIComponent("Passwort gesetzt. Du kannst dich jetzt anmelden.")}`);
}
