/**
 * R2 env parsing without secrets in logs.
 * Required for live private document storage.
 */

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string;
  region: string;
};

export type R2ConfigParseResult =
  | { ok: true; config: R2Config }
  | { ok: false; missing: string[]; invalid: string[] };

/** HTTPS endpoint; allows default and jurisdiction hosts (`*.r2.cloudflarestorage.com`). */
export function isPlausibleR2Endpoint(endpoint: string): boolean {
  const value = endpoint.trim();
  if (!/^https:\/\/[^\s/]+/i.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function readR2ConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env
): R2ConfigParseResult {
  const accountId = env.R2_ACCOUNT_ID?.trim() ?? "";
  const accessKeyId = env.R2_ACCESS_KEY_ID?.trim() ?? "";
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim() ?? "";
  const bucket = env.R2_BUCKET?.trim() ?? "";
  const endpoint = env.R2_ENDPOINT?.trim() ?? "";
  const region = (env.R2_REGION?.trim() || "auto").trim();

  const missing: string[] = [];
  if (!accountId) missing.push("R2_ACCOUNT_ID");
  if (!accessKeyId) missing.push("R2_ACCESS_KEY_ID");
  if (!secretAccessKey) missing.push("R2_SECRET_ACCESS_KEY");
  if (!bucket) missing.push("R2_BUCKET");
  if (!endpoint) missing.push("R2_ENDPOINT");

  const invalid: string[] = [];
  if (endpoint && !isPlausibleR2Endpoint(endpoint)) invalid.push("R2_ENDPOINT");

  if (missing.length || invalid.length) return { ok: false, missing, invalid };

  return {
    ok: true,
    config: { accountId, accessKeyId, secretAccessKey, bucket, endpoint, region },
  };
}

export function hasR2Config(env: NodeJS.ProcessEnv = process.env): boolean {
  return readR2ConfigFromEnv(env).ok;
}
