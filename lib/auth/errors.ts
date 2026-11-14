import { ActorAccessError } from "./actor-binding";
export { summarizeAuthError, toSafeAuthMessage } from "./auth-messages";

export class AuthError extends Error {
  readonly code: "UNAUTHENTICATED" | "FORBIDDEN";

  constructor(code: "UNAUTHENTICATED" | "FORBIDDEN", message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

export function toAuthHttpError(error: unknown): AuthError | null {
  if (error instanceof AuthError) return error;
  if (error instanceof ActorAccessError) {
    return new AuthError(error.code, error.message);
  }
  return null;
}
