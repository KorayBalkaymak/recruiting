import type { ResendMailConfig } from "./config";
import type { MailMessage, MailSendResult, MailTransport } from "./types";

export type ResendFetch = (
  input: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: string;
  }
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}>;

export function createResendTransport(
  config: ResendMailConfig,
  fetchImpl: ResendFetch = fetch as ResendFetch
): MailTransport {
  return {
    name: "resend",
    async send(message: MailMessage): Promise<MailSendResult> {
      try {
        const response = await fetchImpl("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: config.from,
            to: [message.to],
            subject: message.subject,
            text: message.text,
            ...(message.html ? { html: message.html } : {}),
            ...(message.replyTo || config.replyTo
              ? { reply_to: message.replyTo || config.replyTo }
              : {}),
          }),
        });

        if (!response.ok) {
          // Never include response body — may echo recipient/content.
          return {
            ok: false,
            provider: "resend",
            reason: `resend_http_${response.status}`,
          };
        }

        const payload = (await response.json()) as { id?: string };
        return {
          ok: true,
          provider: "resend",
          id: typeof payload.id === "string" ? payload.id : undefined,
        };
      } catch {
        return { ok: false, provider: "resend", reason: "resend_network_error" };
      }
    },
  };
}

export function createDemoMailTransport(): MailTransport {
  return {
    name: "demo",
    async send(): Promise<MailSendResult> {
      return { ok: true, provider: "demo" };
    },
  };
}

export function createUnavailableMailTransport(missing: string[]): MailTransport {
  const reason = `missing_config:${missing.join(",")}`;
  return {
    name: "unavailable",
    async send(): Promise<MailSendResult> {
      return { ok: false, provider: "unavailable", reason };
    },
  };
}
