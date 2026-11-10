import type { MailKind, MailSendResult } from "./types";

/** Redact local-part; keep domain for ops debugging without PII dump. */
export function redactEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at <= 0) return "[invalid-email]";
  const domain = normalized.slice(at + 1);
  return `***@${domain || "unknown"}`;
}

/** Strip query strings / tokens from URLs before logging. */
export function redactUrlForLog(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return "[redacted-url]";
  }
}

export function logMailAttempt(input: {
  kind: MailKind;
  to: string;
  result: MailSendResult;
}) {
  const base = {
    event: "mail.send",
    kind: input.kind,
    to: redactEmail(input.to),
    provider: input.result.provider,
    ok: input.result.ok,
  };

  if (input.result.ok) {
    console.info("[mail]", {
      ...base,
      id: input.result.id ? "[id-present]" : undefined,
    });
    return;
  }

  console.warn("[mail]", {
    ...base,
    reason: input.result.reason,
  });
}
