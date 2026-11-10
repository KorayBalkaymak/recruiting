/**
 * Resend env parsing without secrets in logs.
 * Required for live transactional email.
 */

export type ResendMailConfig = {
  apiKey: string;
  from: string;
  replyTo: string | null;
  /** Optional inbox for staff notifications (portal submissions). */
  notifyTo: string | null;
};

export type ResendConfigParseResult =
  | { ok: true; config: ResendMailConfig }
  | { ok: false; missing: string[]; invalid: string[] };

/** Accepts `noreply@domain` or `Name <noreply@domain>`. Does not invent domains. */
export function isPlausibleEmailFrom(from: string): boolean {
  const value = from.trim();
  if (!value || value.length > 320) return false;
  const angled = value.match(/^(.+)<([^>]+)>$/);
  const address = (angled ? angled[2] : value).trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address);
}

export function readResendConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env
): ResendConfigParseResult {
  const apiKey = env.RESEND_API_KEY?.trim() ?? "";
  const from = env.EMAIL_FROM?.trim() ?? "";
  const replyTo = env.EMAIL_REPLY_TO?.trim() || null;
  const notifyTo = env.EMAIL_NOTIFY_TO?.trim() || null;

  const missing: string[] = [];
  if (!apiKey) missing.push("RESEND_API_KEY");
  if (!from) missing.push("EMAIL_FROM");

  const invalid: string[] = [];
  if (from && !isPlausibleEmailFrom(from)) invalid.push("EMAIL_FROM");
  if (replyTo && !isPlausibleEmailFrom(replyTo)) invalid.push("EMAIL_REPLY_TO");
  if (notifyTo && !isPlausibleEmailFrom(notifyTo)) invalid.push("EMAIL_NOTIFY_TO");

  if (missing.length || invalid.length) return { ok: false, missing, invalid };

  return {
    ok: true,
    config: { apiKey, from, replyTo, notifyTo },
  };
}

export function hasResendConfig(env: NodeJS.ProcessEnv = process.env): boolean {
  return readResendConfigFromEnv(env).ok;
}
