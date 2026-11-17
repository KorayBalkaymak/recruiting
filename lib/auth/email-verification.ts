/** Better Auth JWT lifetime for candidate verification links. */
export const EMAIL_VERIFICATION_EXPIRES_IN = 60 * 60 * 24;

export const CANDIDATE_VERIFY_EMAIL_PATH = "/candidate/verify-email";

export type VerifyEmailPageStatus = "check" | "resent" | "ok" | "expired" | "invalid";

export function parseVerifyEmailPageStatus(
  value: string | undefined | null
): VerifyEmailPageStatus {
  if (
    value === "resent" ||
    value === "ok" ||
    value === "expired" ||
    value === "invalid" ||
    value === "check"
  ) {
    return value;
  }
  return "check";
}

function verifyErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const body = "body" in error ? (error as { body?: { code?: unknown } }).body : undefined;
  if (body && typeof body.code === "string") return body.code;
  if ("code" in error && typeof (error as { code?: unknown }).code === "string") {
    return (error as { code: string }).code;
  }
  return null;
}

export function mapVerifyEmailError(error: unknown): "expired" | "invalid" {
  const code = verifyErrorCode(error);
  if (code === "TOKEN_EXPIRED") return "expired";
  if (code === "INVALID_TOKEN" || code === "USER_NOT_FOUND") return "invalid";

  const message =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === "string"
        ? error
        : "";
  if (/TOKEN_EXPIRED|JWTExpired|expir/i.test(message)) return "expired";
  return "invalid";
}

/** Candidates only: staff/invite accounts stay usable with emailVerified=false. */
export function isVerifiedCandidateUser(user: {
  role?: unknown;
  emailVerified?: unknown;
} | null | undefined): boolean {
  if (!user) return false;
  return user.role === "candidate" && user.emailVerified === true;
}

/**
 * Verification mail is for public candidate sign-up only.
 * Staff/invite users keep emailVerified=false and must not be filtered in as candidates.
 * Missing `role` on the Better Auth user object still sends (additionalFields are often omitted).
 */
export function shouldSendCandidateVerificationEmail(user: {
  role?: unknown;
} | null | undefined): boolean {
  if (!user) return false;
  if (
    user.role === "recruiter" ||
    user.role === "kam" ||
    user.role === "geschaeftsleitung" ||
    user.role === "admin"
  ) {
    return false;
  }
  return true;
}

export type CandidateLoginDecision = "authenticated" | "unverified" | "not_candidate" | "invalid";

/** Staff sessions must never count as a successful candidate login. */
export function decideCandidateLoginAccess(user: {
  role?: unknown;
  emailVerified?: unknown;
} | null | undefined): CandidateLoginDecision {
  if (!user) return "invalid";
  if (user.role !== "candidate") return "not_candidate";
  if (user.emailVerified !== true) return "unverified";
  return "authenticated";
}

export async function runCandidateVerificationSend<T>(
  user: { email?: string; role?: unknown } | null | undefined,
  send: () => Promise<T>
): Promise<T | "skipped"> {
  if (!user || !shouldSendCandidateVerificationEmail(user)) return "skipped";
  return send();
}
