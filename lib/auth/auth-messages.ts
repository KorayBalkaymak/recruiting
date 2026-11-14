function authApiCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const body = "body" in error ? (error as { body?: { code?: unknown } }).body : undefined;
  if (body && typeof body.code === "string") return body.code;
  if ("code" in error && typeof (error as { code?: unknown }).code === "string") {
    return (error as { code: string }).code;
  }
  return null;
}

function namedCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  if (!("code" in error) || typeof (error as { code?: unknown }).code !== "string") return null;
  const name = "name" in error ? String((error as { name?: unknown }).name) : "";
  if (name === "AuthError" || name === "ActorAccessError") {
    return (error as { code: string }).code;
  }
  return null;
}

/** Safe, user-facing auth copy. Never includes secrets or raw exception text. */
export function toSafeAuthMessage(error: unknown) {
  const named = namedCode(error);
  if (named === "UNAUTHENTICATED") return "Anmeldung erforderlich.";
  if (named === "FORBIDDEN") return "Keine Berechtigung für diese Aktion.";

  const code = authApiCode(error);
  if (
    code === "INVALID_EMAIL_OR_PASSWORD" ||
    code === "INVALID_PASSWORD" ||
    code === "USER_NOT_FOUND"
  ) {
    return "Ungültige Anmeldedaten.";
  }
  if (
    code === "INVALID_ORIGIN" ||
    code === "MISSING_OR_NULL_ORIGIN" ||
    code === "CROSS_SITE_NAVIGATION_LOGIN_BLOCKED"
  ) {
    return "Anmeldung von dieser Adresse ist nicht erlaubt. BETTER_AUTH_URL muss exakt die Live-URL sein (https://…).";
  }

  const message = error instanceof Error ? error.message : "";
  if (/BETTER_AUTH|NEXT_PUBLIC_APP_URL|nicht gesetzt|zu kurz/i.test(message)) {
    return "Auth-Konfiguration unvollständig. BETTER_AUTH_SECRET und BETTER_AUTH_URL prüfen.";
  }
  if (/DATABASE_URL|Neon|ERR_INVALID_URL|Invalid URL/i.test(message)) {
    return "Datenbankverbindung fehlgeschlagen. DATABASE_URL prüfen.";
  }

  return "Die Anfrage konnte nicht verarbeitet werden.";
}

export function summarizeAuthError(error: unknown): string {
  const code = authApiCode(error);
  const name = error instanceof Error ? error.name : typeof error;
  const status =
    error && typeof error === "object" && "statusCode" in error
      ? String((error as { statusCode?: unknown }).statusCode)
      : "n/a";
  return `name=${name} status=${status} code=${code ?? "n/a"}`;
}
