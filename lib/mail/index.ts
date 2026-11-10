export {
  hasResendConfig,
  isPlausibleEmailFrom,
  readResendConfigFromEnv,
} from "./config";
export { redactEmail, redactUrlForLog } from "./log";
export {
  PASSWORD_TOKEN_TTL_SECONDS,
  consumeSecureToken,
  createMemorySecureTokenStore,
  generateRawToken,
  hashToken,
  issueSecureToken,
} from "./secure-token";
export { rewriteResetCallbackUrl } from "./send-url";
export type { MailKind, MailMessage, MailSendResult, MailTransport } from "./types";

// Server-only orchestration (getMailTransport / sendMail / deliver*) stays in
// `./send` and `./transport` — import those from server modules, not here,
// so Node unit tests can load pure helpers without `server-only`.
