/**
 * Normalize DATABASE_URL for Neon / Node `URL` parsing.
 *
 * Local `.env` loaders strip surrounding quotes; Vercel/UI pastes often keep them
 * or add trailing punctuation / zero-width chars — that yields ERR_INVALID_URL
 * inside @neondatabase/serverless.
 */

export type DatabaseUrlDiagnosis = {
  present: boolean;
  length: number;
  schemeOk: boolean;
  neonParseOk: boolean;
  hasHost: boolean;
  hasUser: boolean;
  hasDatabase: boolean;
  fixedByUserinfoEncoding: boolean;
  strippedChannelBinding: boolean;
  strippedTrailingDot: boolean;
  wrapper:
    | "none"
    | "double-quote"
    | "single-quote"
    | "smart-quote"
    | "backtick"
    | "backslash-quote"
    | "bom"
    | "other";
  firstCharCode: number | null;
  lastCharCode: number | null;
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

/** Remove BOM, quotes, control/zero-width chars, CR/LF, accidental trailing `.` */
export function stripWrappers(raw: string): {
  value: string;
  strippedTrailingDot: boolean;
} {
  let value = raw.replace(/^\uFEFF/, "");
  value = value.replace(/[\u0000-\u001F\u007F\u200B-\u200D\uFEFF]/g, "");
  value = value.trim();

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
    if (value === before) break;
  }

  // Chat/docs paste often appends a sentence period after the URI.
  let strippedTrailingDot = false;
  if (value.endsWith(".") && /[a-z0-9]$/i.test(value.slice(0, -1))) {
    value = value.slice(0, -1);
    strippedTrailingDot = true;
  }

  return { value, strippedTrailingDot };
}

/**
 * Same parse approach as @neondatabase/serverless (URLFromPgConnectionString).
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

/** Neon HTTP driver does not need channel_binding; drop it to avoid paste/driver quirks. */
export function stripChannelBindingParam(connectionString: string): {
  value: string;
  stripped: boolean;
} {
  try {
    const protocol = new URL(connectionString).protocol;
    const asHttp = new URL("http:" + connectionString.slice(protocol.length));
    if (!asHttp.searchParams.has("channel_binding")) {
      return { value: connectionString, stripped: false };
    }
    asHttp.searchParams.delete("channel_binding");
    const next = protocol + asHttp.href.slice("http:".length);
    return { value: next, stripped: true };
  } catch {
    const cleaned = connectionString
      .replace(/([?&])channel_binding=[^&]*&?/i, "$1")
      .replace(/[?&]$/, "");
    return {
      value: cleaned,
      stripped: cleaned !== connectionString,
    };
  }
}

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
      strippedChannelBinding: false,
      strippedTrailingDot: false,
      wrapper: "none",
      firstCharCode: null,
      lastCharCode: null,
    };
  }

  const trimmed = raw.replace(/^\uFEFF/, "").trim();
  const wrapper = detectWrapper(trimmed);
  const { value: normalized, strippedTrailingDot } = stripWrappers(raw);
  let candidate = normalized;
  let fixedByUserinfoEncoding = false;
  if (candidate && !parseNeonConnectionString(candidate)) {
    candidate = encodeDatabaseUrlUserinfo(candidate);
    fixedByUserinfoEncoding = true;
  }
  const channel = candidate ? stripChannelBindingParam(candidate) : { value: "", stripped: false };
  const parsed = channel.value ? parseNeonConnectionString(channel.value) : null;
  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];

  return {
    present: true,
    length: raw.length,
    schemeOk: /^postgres(ql)?:\/\//i.test(normalized),
    neonParseOk: parsed != null,
    hasHost: Boolean(parsed?.hostname),
    hasUser: Boolean(parsed?.username),
    hasDatabase: Boolean(parsed?.pathname && parsed.pathname !== "/"),
    fixedByUserinfoEncoding,
    strippedChannelBinding: channel.stripped,
    strippedTrailingDot,
    wrapper,
    firstCharCode: first ? first.charCodeAt(0) : null,
    lastCharCode: last ? last.charCodeAt(0) : null,
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
    `strippedChannelBinding=${d.strippedChannelBinding}`,
    `strippedTrailingDot=${d.strippedTrailingDot}`,
    `hasHost=${d.hasHost}`,
    `hasUser=${d.hasUser}`,
    `hasDatabase=${d.hasDatabase}`,
    `firstCharCode=${d.firstCharCode ?? "n/a"}`,
    `lastCharCode=${d.lastCharCode ?? "n/a"}`,
  ]
    .filter(Boolean)
    .join(" ");
}

export function normalizeDatabaseUrl(raw: string | undefined | null): string {
  const diagnosis = diagnoseDatabaseUrl(raw);
  if (!diagnosis.present) {
    throw new Error("DATABASE_URL ist nicht gesetzt.");
  }

  let { value, strippedTrailingDot } = stripWrappers(raw as string);
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

  // Always re-encode userinfo. Neon passwords often contain @ # / ? and paste
  // variants only sometimes fail the first URL parse.
  value = encodeDatabaseUrlUserinfo(value);

  const channel = stripChannelBindingParam(value);
  value = channel.value;

  const parsed = parseNeonConnectionString(value);
  if (!parsed) {
    throw new Error(
      `DATABASE_URL ist ungültig (ERR_INVALID_URL). (${formatDatabaseUrlDiagnosis({
        ...diagnosis,
        strippedTrailingDot,
        strippedChannelBinding: channel.stripped,
      })})`
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
        strippedTrailingDot,
        strippedChannelBinding: channel.stripped,
      })})`
    );
  }

  return value;
}

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
      return { url, source: key, diagnosis: { ...diagnoseDatabaseUrl(url), source: key, length: raw.length, wrapper: diagnosis.wrapper } };
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

/** Build Neon HTTP SQL endpoint host (safe; no secrets). */
export function neonHttpSqlEndpoint(hostname: string): string {
  const host = hostname.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  if (!host || /[/\s"']/.test(host)) {
    throw new Error(`Ungültiger Neon-Hostname für HTTP-Endpoint.`);
  }
  const apiHost = host.replace(/^[^.]+\./, "api.");
  return `https://${apiHost}/sql`;
}

/** Classify a URL-ish string for logs — never returns the raw value. */
export function classifyUrlShape(value: string | undefined | null): string {
  if (value == null) return "nullish";
  if (value.length === 0) return "empty";
  const trimmed = value.replace(/^\uFEFF/, "").trim();
  if (!trimmed) return "whitespace";
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return "quoted";
  }
  if (/^postgres(ql)?:\/\//i.test(trimmed)) return "postgres";
  if (/^https:\/\//i.test(trimmed)) return "https";
  if (/^http:\/\//i.test(trimmed)) return "http";
  if (!/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return "missing-scheme";
  return "other-scheme";
}

export type NeonConnectionParams = {
  host: string;
  user: string;
  password: string;
  database: string;
  sslMode: string | null;
};

/** Discrete Neon params — avoids handing a fragile URI string through fetch paths. */
export function toNeonConnectionParams(connectionString: string): NeonConnectionParams {
  const parsed = parseNeonConnectionString(connectionString);
  if (!parsed?.hostname || !parsed.username || !parsed.pathname || parsed.pathname === "/") {
    throw new Error("Neon-Connection-Parameter unvollständig nach Normalisierung.");
  }
  const database = parsed.pathname.replace(/^\//, "").split("/")[0] ?? "";
  if (!database) {
    throw new Error("Neon-Database-Name fehlt nach Normalisierung.");
  }
  return {
    host: parsed.hostname,
    user: decodeUriComponentSafe(parsed.username),
    password: decodeUriComponentSafe(parsed.password),
    database,
    sslMode: parsed.searchParams.get("sslmode"),
  };
}

/** Safe summary of a thrown DB/fetch error (no secrets). */
export function summarizeDbError(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current; depth++) {
    if (current instanceof Error) {
      parts.push(
        `d${depth}:${current.name}:${current.message.slice(0, 160).replace(/postgresql:\/\/[^\s]+/gi, "postgresql://[redacted]")}`
      );
      const withInput = current as Error & { input?: unknown; code?: string };
      if (withInput.code) parts.push(`code=${withInput.code}`);
      if (withInput.input != null) {
        parts.push(`inputShape=${classifyUrlShape(String(withInput.input))}`);
        parts.push(`inputLen=${String(withInput.input).length}`);
      }
      const source = (current as Error & { sourceError?: unknown }).sourceError;
      current = source ?? current.cause;
      continue;
    }
    parts.push(`d${depth}:${typeof current}`);
    break;
  }
  return parts.join(" | ");
}
