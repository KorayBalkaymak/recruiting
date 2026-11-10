import "server-only";

import type { PrivateDocumentStorage } from "./types";
import { readB2ConfigFromEnv } from "./b2-config";
import { createS3CompatiblePrivateStorage } from "./s3-compatible-store";

/**
 * Private Backblaze B2 storage via S3-compatible API — no public URLs.
 */
export function createB2PrivateStorage(): PrivateDocumentStorage {
  const parsed = readB2ConfigFromEnv();
  if (!parsed.ok) {
    const parts = [
      parsed.missing.length ? `fehlt: ${parsed.missing.join(", ")}` : "",
      parsed.invalid.length ? `ungültig: ${parsed.invalid.join(", ")}` : "",
    ].filter(Boolean);
    throw new Error(`B2 ist unvollständig konfiguriert (${parts.join("; ")}).`);
  }
  const { config } = parsed;
  return createS3CompatiblePrivateStorage("b2", {
    accessKeyId: config.keyId,
    secretAccessKey: config.applicationKey,
    bucket: config.bucket,
    endpoint: config.endpoint,
    region: config.region,
  });
}
