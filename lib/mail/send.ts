import "server-only";

import { isInternalInvite } from "@/lib/auth/invite-context";
import {
  clearInviteAwaitingPasswordEmail,
  markInviteAwaitingPasswordEmail,
} from "@/lib/auth/invite-delivery";
import { isDemoMode } from "@/lib/demo/mode";
import { logMailAttempt, redactUrlForLog } from "./log";
import {
  buildPasswordResetEmail,
  buildPortalStatusEmail,
  buildPortalSubmittedStaffEmail,
  buildStaffInviteEmail,
} from "./templates";
import { rewriteResetCallbackUrl } from "./send-url";
import { getMailTransport } from "./transport";
import type { MailMessage, MailSendResult } from "./types";
import { readResendConfigFromEnv } from "./config";

export { rewriteResetCallbackUrl } from "./send-url";

function appBaseUrl(): string {
  const base = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  return base.replace(/\/$/, "");
}

export async function sendMail(message: MailMessage): Promise<MailSendResult> {
  const transport = getMailTransport();
  const result = await transport.send(message);
  logMailAttempt({ kind: message.kind, to: message.to, result });
  return result;
}

/**
 * Better Auth `sendResetPassword` hook.
 * Uses the provider URL (contains one-time token); never logs the token/URL query.
 */
export async function deliverPasswordSetupEmail(input: {
  user: { email: string; name?: string | null };
  url: string;
  token: string;
}): Promise<void> {
  // Token is required by Better Auth contract; we never log or store it here.
  void input.token;

  if (isDemoMode()) {
    markInviteAwaitingPasswordEmail(input.user.email);
    const result = await sendMail(
      buildPasswordResetEmail({
        to: input.user.email,
        fullName: input.user.name ?? undefined,
        resetUrl: input.url,
      })
    );
    if (result.ok) clearInviteAwaitingPasswordEmail(input.user.email);
    return;
  }

  const inviteContext = isInternalInvite();
  const setupUrl = rewriteResetCallbackUrl(input.url, appBaseUrl());
  void redactUrlForLog(setupUrl);

  const message = inviteContext
    ? buildStaffInviteEmail({
        to: input.user.email,
        fullName: input.user.name?.trim() || "Kolleg:in",
        setupUrl,
      })
    : buildPasswordResetEmail({
        to: input.user.email,
        fullName: input.user.name ?? undefined,
        resetUrl: setupUrl,
      });

  markInviteAwaitingPasswordEmail(input.user.email);
  const result = await sendMail(message);
  if (result.ok) {
    clearInviteAwaitingPasswordEmail(input.user.email);
    return;
  }

  // Staff invites must surface failure to the inviting admin.
  // Forgot-password soft-fails (generic client message) to avoid account enumeration.
  if (inviteContext) {
    throw new Error(
      result.provider === "unavailable"
        ? "E-Mail-Versand ist nicht konfiguriert (RESEND_API_KEY / EMAIL_FROM)."
        : "E-Mail-Versand ist fehlgeschlagen."
    );
  }
}

export async function notifyCandidatePortalStatus(input: {
  to: string;
  firstName: string;
  status: string;
  note?: string | null;
}): Promise<MailSendResult> {
  const base = appBaseUrl();
  const statusUrl = `${base || "http://localhost:3000"}/candidate/status`;
  return sendMail(
    buildPortalStatusEmail({
      to: input.to,
      firstName: input.firstName,
      status: input.status,
      note: input.note,
      statusUrl,
    })
  );
}

export async function notifyStaffPortalSubmitted(input: {
  candidateLabel: string;
  candidateId: string;
}): Promise<MailSendResult | null> {
  if (isDemoMode()) return null;
  const parsed = readResendConfigFromEnv();
  if (!parsed.ok || !parsed.config.notifyTo) return null;

  const base = appBaseUrl() || "http://localhost:3000";
  return sendMail(
    buildPortalSubmittedStaffEmail({
      to: parsed.config.notifyTo,
      candidateLabel: input.candidateLabel,
      reviewUrl: `${base}/portal-pruefungen/${input.candidateId}`,
    })
  );
}
