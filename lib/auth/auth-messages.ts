function walkErrors(error: unknown): unknown[] {
  const seen: unknown[] = [];
  let current: unknown = error;
  for (let i = 0; i < 6 && current; i++) {
    seen.push(current);
    if (typeof current === "object" && current && "cause" in current) {
      current = (current as { cause?: unknown }).cause;
      continue;
    }
    if (typeof current === "object" && current && "sourceError" in current) {
      current = (current as { sourceError?: unknown }).sourceError;
      continue;
    }
    break;
  }
  return seen;
}

function authApiCode(error: unknown): string | null {
  for (const item of walkErrors(error)) {
    if (!item || typeof item !== "object") continue;
    const body = "body" in item ? (item as { body?: { code?: unknown } }).body : undefined;
    if (body && typeof body.code === "string" && body.code !== "ERR_INVALID_URL") {
      return body.code;
    }
    if ("code" in item && typeof (item as { code?: unknown }).code === "string") {
      const code = (item as { code: string }).code;
      if (code !== "ERR_INVALID_URL") return code;
    }
  }
  return null;
}

function namedCode(error: unknown): string | null {
  for (const item of walkErrors(error)) {
    if (!item || typeof item !== "object") continue;
    if (!("code" in item) || typeof (item as { code?: unknown }).code !== "string") continue;
    const name = "name" in item ? String((item as { name?: unknown }).name) : "";
    if (name === "AuthError" || name === "ActorAccessError") {
      return (item as { code: string }).code;
    }
  }
  return null;
}

function combinedMessage(error: unknown): string {
  return walkErrors(error)
    .map((item) => (item instanceof Error ? item.message : ""))
    .filter(Boolean)
    .join(" | ");
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
    return "Anmeldung von dieser Adresse ist nicht erlaubt. BETTER_AUTH_URL muss die Live-URL sein (https://…vercel.app), nicht localhost.";
  }

  const message = combinedMessage(error);
  if (/BETTER_AUTH|NEXT_PUBLIC_APP_URL|nicht gesetzt|zu kurz|localhost/i.test(message)) {
    return "Auth-Konfiguration unvollständig. BETTER_AUTH_URL auf die Live-URL setzen (nicht localhost).";
  }
  if (/DATABASE_URL|Neon|ERR_INVALID_URL|Invalid URL|Failed query|fetch fehlgeschlagen/i.test(message)) {
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
  const top = error instanceof Error ? error.message.slice(0, 120).replace(/postgresql:\/\/\S+/gi, "postgresql://[redacted]") : "";
  return `name=${name} status=${status} code=${code ?? "n/a"} msg=${top}`;
}
