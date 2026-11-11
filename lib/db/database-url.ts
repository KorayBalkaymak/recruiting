/**
 * Normalize DATABASE_URL for Neon / Node `URL` parsing.
 *
 * Local `.env` loaders strip surrounding quotes; Vercel/UI pastes often keep them
 * (`"postgresql://..."`), which yields ERR_INVALID_URL inside @neondatabase/serverless.
 *
 * On Vercel + Neon integration, a valid URL may live in POSTGRES_URL /
 * DATABASE_URL_UNPOOLED while DATABASE_URL was pasted incorrectly.
 */

export type DatabaseUrlDiagnosis = {
  present: boolean;
  length: number;
  schemeOk: boolean;
  neonParseOk: boolean;
  hasHost: boolean;
  hasUser: boolean;
  hasDatabase: boolean;
  /** True when raw parse fails but userinfo encoding would make Neon accept it. */
  fixedByUserinfoEncoding: boolean;
  wrapper:
    | "none"
    | "double-quote"
    | "single-quote"
    | "smart-quote"
    | "backtick"
    | "backslash-quote"
    | "bom"
    | "other";
  /** First non-whitespace char code only — never the secret itself. */
  firstCharCode: number | null;
  source?: string;
};

const SMART_QUOTES = new Set(["\u201C", "\u201D", "\u2018", "\u2019"]);

/** Prefer app DATABASE_URL; fall back to common Vercel/Neon integration names. */
export const DATABASE_URL_ENV_CANDIDATES = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
  "NEON_DATABASE_URL",
] as const;

function detectWrapper(value: string): DatabaseUrlDiagnosis["wrapper"] {
  if (!value) return "none";
  if (value.charCodeAt(0) === 0xfeff) return "bom";
  const first = value[0];
  const last = value[value.length - 1];
  if (first === '"' && last === '"') return "double-quote";
  if (first === "'" && last === "'") return "single-quote";
  if (SMART_QUOTES.has(first) && SMART_QUOTES.has(last)) return "smart-quote";
  if (first === "`" && last === "`") return "backtick";
  if (value.startsWith('\\"') && value.endsWith('\\"')) return "backslash-quote";
  if (first === '"' || first === "'" || SMART_QUOTES.has(first) || first === "`") {
    return "other";
  }
  return "none";
}

function stripWrappers(raw: string): string {
  let value = raw.replace(/^\uFEFF/, "").trim();
  // Repeat a few times for nested / duplicated paste artifacts.
  for (let i = 0; i < 3; i++) {
    const before = value;
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith("`") && value.endsWith("`")) ||
      (SMART_QUOTES.has(value[0] ?? "") && SMART_QUOTES.has(value[value.length - 1] ?? ""))
    ) {
      value = value.slice(1, -1).trim();
    }
    if (value.startsWith('\\"') && value.endsWith('\\"')) {
      value = value.slice(2, -2).trim();
    }
    // Strip accidental CR from copy/paste (keep intentional query string).
    value = value.replace(/\r\n/g, "").replace(/\r/g, "").trim();
    if (value === before) break;
  }
  return value;
}

/**
 * Same parse approach as @neondatabase/serverless (URLFromPgConnectionString).
 * Returns null when the driver would throw ERR_INVALID_URL.
 */
export function parseNeonConnectionString(connectionString: string): URL | null {
  try {
    const protocol = new URL(connectionString).protocol;
    return new URL("http:" + connectionString.slice(protocol.length));
  } catch {
    return null;
  }
}

function decodeUriComponentSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Percent-encode user/password so raw `#`, `/`, `?` etc. in Neon passwords
 * do not break `new URL()` (common Vercel paste without encoding).
 *
 * Uses the last `@` before the host so `#`/`?` inside the password are kept
 * in the userinfo segment.
 */
export function encodeDatabaseUrlUserinfo(connectionString: string): string {
  const schemeMatch = connectionString.match(/^(postgres(?:ql)?:\/\/)/i);
  if (!schemeMatch) return connectionString;

  const scheme = schemeMatch[1];
  const afterScheme = connectionString.slice(scheme.length);
  const at = afterScheme.lastIndexOf("@");
  if (at <= 0) return connectionString;

  const userinfo = afterScheme.slice(0, at);
  const hostPathQuery = afterScheme.slice(at + 1);
  const colon = userinfo.indexOf(":");
  const user = colon === -1 ? userinfo : userinfo.slice(0, colon);
  const password = colon === -1 ? null : userinfo.slice(colon + 1);

  const encUser = encodeURIComponent(decodeUriComponentSafe(user));
  const encPassword =
    password == null ? null : encodeURIComponent(decodeUriComponentSafe(password));
  const nextUserinfo = encPassword == null ? encUser : `${encUser}:${encPassword}`;

  return `${scheme}${nextUserinfo}@${hostPathQuery}`;
}

/** Safe, non-secret diagnosis for logs / error messages. */
export function diagnoseDatabaseUrl(raw: string | undefined | null): DatabaseUrlDiagnosis {
  if (raw == null) {
    return {
      present: false,
      length: 0,
      schemeOk: false,
      neonParseOk: false,
      hasHost: false,
      hasUser: false,
      hasDatabase: false,
      fixedByUserinfoEncoding: false,
      wrapper: "none",
      firstCharCode: null,
    };
  }

  const trimmed = raw.replace(/^\uFEFF/, "").trim();
  const wrapper = detectWrapper(trimmed);
  const normalized = stripWrappers(raw);
  const parsedDirect = normalized ? parseNeonConnectionString(normalized) : null;
  const encoded = normalized ? encodeDatabaseUrlUserinfo(normalized) : "";
  const parsedEncoded =
    !parsedDirect && encoded ? parseNeonConnectionString(encoded) : null;
  const parsed = parsedDirect ?? parsedEncoded;
  const first = trimmed[0];

  return {
    present: true,
    length: raw.length,
    schemeOk: /^postgres(ql)?:\/\//i.test(normalized),
    neonParseOk: parsed != null,
    hasHost: Boolean(parsed?.hostname),
    hasUser: Boolean(parsed?.username),
    hasDatabase: Boolean(parsed?.pathname && parsed.pathname !== "/"),
    fixedByUserinfoEncoding: parsedDirect == null && parsedEncoded != null,
    wrapper,
    firstCharCode: first ? first.charCodeAt(0) : null,
  };
}

export function formatDatabaseUrlDiagnosis(d: DatabaseUrlDiagnosis): string {
  return [
    d.source ? `source=${d.source}` : null,
    `present=${d.present}`,
    `len=${d.length}`,
    `wrapper=${d.wrapper}`,
    `schemeOk=${d.schemeOk}`,
    `neonParseOk=${d.neonParseOk}`,
    `fixedByUserinfoEncoding=${d.fixedByUserinfoEncoding}`,
    `hasHost=${d.hasHost}`,
    `hasUser=${d.hasUser}`,
    `hasDatabase=${d.hasDatabase}`,
    `firstCharCode=${d.firstCharCode ?? "n/a"}`,
  ]
    .filter(Boolean)
    .join(" ");
}

export function normalizeDatabaseUrl(raw: string | undefined | null): string {
  const diagnosis = diagnoseDatabaseUrl(raw);
  if (!diagnosis.present) {
    throw new Error("DATABASE_URL ist nicht gesetzt.");
  }

  let value = stripWrappers(raw as string);
  if (!value) {
    throw new Error(
      `DATABASE_URL ist leer. (${formatDatabaseUrlDiagnosis(diagnosis)})`
    );
  }

  if (!/^postgres(ql)?:\/\//i.test(value)) {
    throw new Error(
      `DATABASE_URL muss mit postgresql:// oder postgres:// beginnen. (${formatDatabaseUrlDiagnosis(diagnosis)})`
    );
  }

  // Raw `#` `/` `?` in passwords break Node/Neon URL parsing — encode userinfo.
  if (!parseNeonConnectionString(value)) {
    value = encodeDatabaseUrlUserinfo(value);
  }

  const parsed = parseNeonConnectionString(value);
  if (!parsed) {
    throw new Error(
      `DATABASE_URL ist ungültig (ERR_INVALID_URL). Oft Ursache: Sonderzeichen im Passwort (# / ?) — Neon-URI encoded kopieren oder Passwort URL-encoden. (${formatDatabaseUrlDiagnosis(diagnosis)})`
    );
  }

  if (!parsed.hostname || !parsed.username || !parsed.pathname || parsed.pathname === "/") {
    throw new Error(
      `DATABASE_URL unvollständig (User/Host/Database fehlen). (${formatDatabaseUrlDiagnosis({
        ...diagnosis,
        neonParseOk: true,
        hasHost: Boolean(parsed.hostname),
        hasUser: Boolean(parsed.username),
        hasDatabase: Boolean(parsed.pathname && parsed.pathname !== "/"),
      })})`
    );
  }

  return value;
}

/**
 * Resolve a usable Neon connection string from env (never logs the value).
 */
export function resolveDatabaseUrl(
  env: NodeJS.ProcessEnv = process.env
): { url: string; source: string; diagnosis: DatabaseUrlDiagnosis } {
  const attempts: string[] = [];

  for (const key of DATABASE_URL_ENV_CANDIDATES) {
    const raw = env[key];
    if (raw == null || !String(raw).trim()) continue;
    const diagnosis = { ...diagnoseDatabaseUrl(raw), source: key };
    try {
      const url = normalizeDatabaseUrl(raw);
      return { url, source: key, diagnosis };
    } catch (error) {
      attempts.push(
        `${key}: ${error instanceof Error ? error.message : "invalid"}`
      );
    }
  }

  if (attempts.length === 0) {
    throw new Error(
      `Keine Datenbank-URL gesetzt. Erwartet eine von: ${DATABASE_URL_ENV_CANDIDATES.join(", ")}.`
    );
  }

  throw new Error(
    `Keine gültige Datenbank-URL gefunden. Versuche:\n- ${attempts.join("\n- ")}`
  );
}
