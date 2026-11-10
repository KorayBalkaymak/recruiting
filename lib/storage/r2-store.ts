import "server-only";

import type { PrivateDocumentStorage } from "./types";
import { readR2ConfigFromEnv } from "./r2-config";
import { createS3CompatiblePrivateStorage } from "./s3-compatible-store";

/**
 * Private R2 (S3-compatible) storage — no public URLs, server-side access only.
 */
export function createR2PrivateStorage(): PrivateDocumentStorage {
  const parsed = readR2ConfigFromEnv();
  if (!parsed.ok) {
    const parts = [
      parsed.missing.length ? `fehlt: ${parsed.missing.join(", ")}` : "",
      parsed.invalid.length ? `ungültig: ${parsed.invalid.join(", ")}` : "",
    ].filter(Boolean);
    throw new Error(`R2 ist unvollständig konfiguriert (${parts.join("; ")}).`);
  }
  const { config } = parsed;
  return createS3CompatiblePrivateStorage("r2", {
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    bucket: config.bucket,
    endpoint: config.endpoint,
    region: config.region,
  });
}
