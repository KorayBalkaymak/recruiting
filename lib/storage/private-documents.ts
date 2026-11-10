import "server-only";

import { isDemoMode } from "@/lib/demo/mode";
import { createMemoryPrivateStorage } from "./memory-store";
import { createUnavailablePrivateStorage } from "./unavailable-store";
import { createB2PrivateStorage } from "./b2-store";
import { createR2PrivateStorage } from "./r2-store";
import { hasB2Config, readB2ConfigFromEnv } from "./b2-config";
import { hasR2Config, readR2ConfigFromEnv } from "./r2-config";
import type { PrivateDocumentStorage } from "./types";

export {
  assertSafeCvUpload,
  buildPrivateStorageKey,
  contentDispositionAttachment,
  CV_ALLOWED_MIME_TYPES,
  CV_MAX_BYTES,
  detectCvMimeFromBuffer,
  FileValidationError,
  sanitizeUploadFileName,
} from "./file-validation";

/**
 * Returns a private document storage backend.
 * - Demo: in-memory only (never public URLs)
 * - Live with complete B2 env: Backblaze B2 via S3 API (preferred)
 * - Live with complete R2 env: Cloudflare R2 via S3 API
 * - Live without either: unavailable (uploads rejected with clear error)
 *
 * Access must stay server-authorized — never expose public object URLs.
 */
export function getPrivateDocumentStorage(): PrivateDocumentStorage {
  if (isDemoMode()) {
    return createMemoryPrivateStorage();
  }
  if (hasB2Config()) {
    return createB2PrivateStorage();
  }
  if (hasR2Config()) {
    return createR2PrivateStorage();
  }
  return createUnavailablePrivateStorage();
}

/** Bucket name for metadata only — never logs credentials. */
export function getConfiguredPrivateBucketName(): string {
  if (isDemoMode()) return "demo-private";
  const b2 = readB2ConfigFromEnv();
  if (b2.ok) return b2.config.bucket;
  const r2 = readR2ConfigFromEnv();
  if (r2.ok) return r2.config.bucket;
  return "private";
}

export function describePrivateStorageStatus(): {
  mode: "demo" | "live";
  provider: PrivateDocumentStorage["provider"];
  configured: boolean;
} {
  const storage = getPrivateDocumentStorage();
  return {
    mode: isDemoMode() ? "demo" : "live",
    provider: storage.provider,
    configured: storage.isConfigured(),
  };
}
