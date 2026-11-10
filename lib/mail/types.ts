export type MailKind =
  | "staff_invite"
  | "password_reset"
  | "portal_status"
  | "portal_submitted";

export type MailMessage = {
  kind: MailKind;
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

export type MailSendResult =
  | { ok: true; provider: "resend" | "demo" | "log"; id?: string }
  | { ok: false; provider: "resend" | "unavailable" | "demo"; reason: string };

export type MailTransport = {
  readonly name: "resend" | "demo" | "unavailable";
  send(message: MailMessage): Promise<MailSendResult>;
};
