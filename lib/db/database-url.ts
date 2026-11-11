/**
 * Normalize DATABASE_URL for Neon / Node `URL` parsing.
 *
 * Local `.env` loaders strip surrounding quotes; Vercel/UI pastes often keep them
 * (`"postgresql://..."`), which yields ERR_INVALID_URL inside @neondatabase/serverless.
 */
export function normalizeDatabaseUrl(raw: string | undefined | null): string {
  if (raw == null) {
    throw new Error("DATABASE_URL ist nicht gesetzt.");
  }

  let value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }

  if (!value) {
    throw new Error("DATABASE_URL ist leer.");
  }

  if (!/^postgres(ql)?:\/\//i.test(value)) {
    throw new Error(
      "DATABASE_URL muss mit postgresql:// oder postgres:// beginnen (keine Anführungszeichen in Vercel)."
    );
  }

  try {
    // Neon uses `new URL(connectionString)` internally.
    // eslint-disable-next-line no-new
    new URL(value);
  } catch {
    throw new Error(
      "DATABASE_URL ist ungültig (ERR_INVALID_URL). In Vercel den Wert ohne Anführungszeichen eintragen."
    );
  }

  return value;
}
