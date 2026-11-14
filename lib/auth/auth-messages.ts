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

/** Safe URL shape for login copy. Never pass the raw connection string. */
export type DatabaseUrlHint = {
  present: boolean;
  wrapper: string;
  schemeOk: boolean;
  neonParseOk: boolean;
};

/** Safe, user-facing auth copy. Never includes secrets or raw exception text. */
export function toSafeAuthMessage(error: unknown, dbUrl?: DatabaseUrlHint) {
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
  if (/BETTER_AUTH_SECRET|zu kurz \(mind/i.test(message)) {
    return "BETTER_AUTH_SECRET fehlt oder ist kürzer als 32 Zeichen. In .env.local setzen und den Dev-Server neu starten.";
  }
  if (/BETTER_AUTH|NEXT_PUBLIC_APP_URL/i.test(message) && !/DATABASE_URL|Neon|Failed query/i.test(message)) {
    return "Auth-Konfiguration unvollständig. BETTER_AUTH_URL muss zur Adresse in der Browserzeile passen (inkl. Port).";
  }
  if (/ERR_INVALID_URL|Invalid URL/i.test(message) && !/Failed query|Neon|DATABASE_URL/i.test(message)) {
    return "Auth-URL ungültig. BETTER_AUTH_URL und NEXT_PUBLIC_APP_URL auf dieselbe Origin setzen wie im Browser, Dev-Server neu starten.";
  }
  if (
    /Keine Datenbank-URL gesetzt/i.test(message) ||
    /DATABASE_URL|Neon|Failed query|fetch fehlgeschlagen|HTTP-Endpoint/i.test(message)
  ) {
    return databaseFailureCopy(message, dbUrl);
  }

  return "Die Anfrage konnte nicht verarbeitet werden.";
}

function databaseFailureCopy(message: string, diagnosis?: DatabaseUrlHint) {
  if (/Keine Datenbank-URL gesetzt/i.test(message) || diagnosis?.present === false) {
    return "Keine DATABASE_URL in dieser Vercel-Umgebung. Unter Environment Variables dieselbe Umgebung wie die Website wählen (Production vs Preview), dann Redeploy.";
  }
  if (diagnosis && diagnosis.wrapper !== "none") {
    return "DATABASE_URL enthält Anführungszeichen oder unsichtbare Zeichen. Wert ohne Quotes einfügen, speichern, Redeploy.";
  }
  if (diagnosis && (!diagnosis.schemeOk || !diagnosis.neonParseOk)) {
    return "DATABASE_URL ist gesetzt, aber kein gültiger postgres:// Connection String. Neon-URI ohne Zusatztext einfügen, dann Redeploy.";
  }
  return "Datenbankabfrage fehlgeschlagen, obwohl DATABASE_URL gesetzt und ohne Anführungszeichen ist. Häufig: Variable nur für Preview statt Production, nach Änderung kein Redeploy, oder Neon-Passwort/Projekt passt nicht. Runtime-Logs nach [db] using durchsuchen.";
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
