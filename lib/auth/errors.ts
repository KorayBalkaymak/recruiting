import { ActorAccessError } from "./actor-binding";

export class AuthError extends Error {
  readonly code: "UNAUTHENTICATED" | "FORBIDDEN";

  constructor(code: "UNAUTHENTICATED" | "FORBIDDEN", message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

export function toSafeAuthMessage(error: unknown) {
  if (error instanceof AuthError || error instanceof ActorAccessError) {
    if (error.code === "UNAUTHENTICATED") return "Anmeldung erforderlich.";
    return "Keine Berechtigung für diese Aktion.";
  }
  return "Die Anfrage konnte nicht verarbeitet werden.";
}

export function toAuthHttpError(error: unknown): AuthError | null {
  if (error instanceof AuthError) return error;
  if (error instanceof ActorAccessError) {
    return new AuthError(error.code, error.message);
  }
  return null;
}
