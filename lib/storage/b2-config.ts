/**
 * Backblaze B2 env parsing (S3-compatible) without secrets in logs.
 * Uses only: B2_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET_NAME, B2_ENDPOINT, B2_REGION.
 */

export type B2Config = {
  keyId: string;
  applicationKey: string;
  bucket: string;
  endpoint: string;
  region: string;
};

export type B2ConfigParseResult =
  | { ok: true; config: B2Config }
  | { ok: false; missing: string[]; invalid: string[] };

/** HTTPS endpoint without embedded credentials (e.g. https://s3.eu-central-003.backblazeb2.com). */
export function isPlausibleB2Endpoint(endpoint: string): boolean {
  const value = endpoint.trim();
  if (!/^https:\/\/[^\s/]+/i.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function readB2ConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env
): B2ConfigParseResult {
  const keyId = env.B2_KEY_ID?.trim() ?? "";
  const applicationKey = env.B2_APPLICATION_KEY?.trim() ?? "";
  const bucket = env.B2_BUCKET_NAME?.trim() ?? "";
  const endpoint = env.B2_ENDPOINT?.trim() ?? "";
  const region = env.B2_REGION?.trim() ?? "";

  const missing: string[] = [];
  if (!keyId) missing.push("B2_KEY_ID");
  if (!applicationKey) missing.push("B2_APPLICATION_KEY");
  if (!bucket) missing.push("B2_BUCKET_NAME");
  if (!endpoint) missing.push("B2_ENDPOINT");
  if (!region) missing.push("B2_REGION");

  const invalid: string[] = [];
  if (endpoint && !isPlausibleB2Endpoint(endpoint)) invalid.push("B2_ENDPOINT");

  if (missing.length || invalid.length) return { ok: false, missing, invalid };

  return {
    ok: true,
    config: { keyId, applicationKey, bucket, endpoint, region },
  };
}

export function hasB2Config(env: NodeJS.ProcessEnv = process.env): boolean {
  return readB2ConfigFromEnv(env).ok;
}
