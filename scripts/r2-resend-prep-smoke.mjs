/**
 * Prep smoke for private storage (B2/R2) + Resend — no invented secrets, no outbound mail by default.
 *
 * Usage:
 *   node scripts/r2-resend-prep-smoke.mjs
 *   node scripts/r2-resend-prep-smoke.mjs --probe-b2      # requires real B2 env; Put/Get/Delete healthchecks/*
 *   node scripts/r2-resend-prep-smoke.mjs --probe-r2      # requires real R2 env; Put/Get/Delete healthchecks/*
 *   node scripts/r2-resend-prep-smoke.mjs --probe-resend   # requires RESEND_API_KEY; GET /domains only (no send)
 *
 * Loads `.env.local` from the project root when present (does not override existing process.env).
 * Never prints secret values. Never POSTs to /emails.
 */
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const Module = require("module");
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad.apply(this, arguments);
};

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Minimal `.env.local` loader (no dotenv dependency).
 * Does not log values. Existing process.env wins.
 */
function loadEnvLocalFile() {
  const envPath = path.join(rootDir, ".env.local");
  if (!fs.existsSync(envPath)) {
    return { loaded: false, keys: 0 };
  }
  const text = fs.readFileSync(envPath, "utf8");
  let keys = 0;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    if (Object.prototype.hasOwnProperty.call(process.env, key)) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
    keys += 1;
  }
  return { loaded: true, keys };
}

const envLocal = loadEnvLocalFile();

const args = new Set(process.argv.slice(2));
const probeB2 = args.has("--probe-b2");
const probeR2 = args.has("--probe-r2");
const probeResend = args.has("--probe-resend");

function ok(name, detail = "") {
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}
function warn(name, detail = "") {
  console.warn(`WARN  ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name, err) {
  console.error(`FAIL  ${name} — ${String(err?.message ?? err).slice(0, 240)}`);
  process.exitCode = 1;
}

function redact(value) {
  if (!value) return "(empty)";
  if (value.length <= 8) return "***";
  return `${value.slice(0, 4)}…(${value.length} chars)`;
}

async function probeS3Compatible(label, config) {
  const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = await import(
    "@aws-sdk/client-s3"
  );
  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  });
  const key = `healthchecks/cms-prep-${randomUUID()}.txt`;
  const body = Buffer.from(`cms-${label}-prep ${new Date().toISOString()}`, "utf8");
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: "text/plain",
    })
  );
  const got = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }));
  const bytes = await got.Body.transformToByteArray();
  if (Buffer.from(bytes).toString("utf8") !== body.toString("utf8")) {
    throw new Error("round-trip body mismatch");
  }
  await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
  ok(`probe_${label}`, "put/get/delete ok key_prefix=healthchecks/");
}

async function main() {
  console.log("B2 / R2 / Resend prep smoke");
  console.log(
    `Flags: probe-b2=${probeB2} probe-r2=${probeR2} probe-resend=${probeResend} (mail send always disabled here)`
  );
  if (envLocal.loaded) {
    ok("env_local", `loaded (.env.local, ${envLocal.keys} keys applied; existing env not overridden)`);
  } else {
    warn("env_local", "not found — using process.env only");
  }

  const { isDemoMode } = await import(
    pathToFileURL(path.join(process.cwd(), "lib/demo/mode.ts")).href
  );
  const demo = isDemoMode();
  ok(
    "demo_mode",
    demo ? "true (B2/R2/Resend unused at runtime)" : "false (live expected)"
  );

  const { readB2ConfigFromEnv, isPlausibleB2Endpoint } = await import(
    pathToFileURL(path.join(process.cwd(), "lib/storage/b2-config.ts")).href
  );
  const { readR2ConfigFromEnv, isPlausibleR2Endpoint } = await import(
    pathToFileURL(path.join(process.cwd(), "lib/storage/r2-config.ts")).href
  );
  const { readResendConfigFromEnv, isPlausibleEmailFrom } = await import(
    pathToFileURL(path.join(process.cwd(), "lib/mail/config.ts")).href
  );

  const b2 = readB2ConfigFromEnv(process.env);
  if (b2.ok) {
    ok(
      "b2_config",
      `bucket=${b2.config.bucket} endpoint_host=${new URL(b2.config.endpoint).hostname} region=${b2.config.region} key=${redact(b2.config.keyId)}`
    );
  } else {
    const detail = [
      b2.missing.length ? `missing=${b2.missing.join(",")}` : "",
      b2.invalid.length ? `invalid=${b2.invalid.join(",")}` : "",
    ]
      .filter(Boolean)
      .join(" ");
    warn("b2_config", `${detail || "incomplete"}${demo ? " (ok in demo)" : ""}`);
  }

  const r2 = readR2ConfigFromEnv(process.env);
  if (r2.ok) {
    ok(
      "r2_config",
      `bucket=${r2.config.bucket} endpoint_host=${new URL(r2.config.endpoint).hostname} region=${r2.config.region} key=${redact(r2.config.accessKeyId)}`
    );
  } else {
    const detail = [
      r2.missing.length ? `missing=${r2.missing.join(",")}` : "",
      r2.invalid.length ? `invalid=${r2.invalid.join(",")}` : "",
    ]
      .filter(Boolean)
      .join(" ");
    warn("r2_config", `${detail || "incomplete"}${demo ? " (ok in demo)" : " (optional if B2 set)"}`);
  }

  if (!demo && !b2.ok && !r2.ok) {
    fail(
      "private_storage",
      new Error("neither B2 nor R2 fully configured (need B2_* or R2_*)")
    );
  } else if (!demo && (b2.ok || r2.ok)) {
    ok("private_storage", b2.ok ? "provider=b2" : "provider=r2");
  }

  const resend = readResendConfigFromEnv(process.env);
  if (resend.ok) {
    ok(
      "resend_config",
      `from=${resend.config.from} replyTo=${resend.config.replyTo ?? "(none)"} notifyTo=${resend.config.notifyTo ?? "(none)"} key=${redact(resend.config.apiKey)}`
    );
    if (!isPlausibleEmailFrom(resend.config.from)) {
      fail("email_from_shape", new Error("EMAIL_FROM failed shape check"));
    }
  } else {
    const detail = [
      resend.missing.length ? `missing=${resend.missing.join(",")}` : "",
      resend.invalid.length ? `invalid=${resend.invalid.join(",")}` : "",
    ]
      .filter(Boolean)
      .join(" ");
    if (demo) warn("resend_config", `${detail || "incomplete"} (ok in demo)`);
    else fail("resend_config", new Error(detail || "incomplete"));
  }

  if (probeB2) {
    if (!b2.ok) {
      fail("probe_b2", new Error("B2 env incomplete — set vars first (no invented credentials)"));
    } else if (!isPlausibleB2Endpoint(b2.config.endpoint)) {
      fail("probe_b2", new Error("B2_ENDPOINT rejected by shape check"));
    } else {
      try {
        await probeS3Compatible("b2", {
          accessKeyId: b2.config.keyId,
          secretAccessKey: b2.config.applicationKey,
          bucket: b2.config.bucket,
          endpoint: b2.config.endpoint,
          region: b2.config.region,
        });
      } catch (error) {
        fail("probe_b2", error);
      }
    }
  } else {
    warn("probe_b2", "skipped (pass --probe-b2 after real credentials are set)");
  }

  if (probeR2) {
    if (!r2.ok) {
      fail("probe_r2", new Error("R2 env incomplete — set vars first (no invented credentials)"));
    } else if (!isPlausibleR2Endpoint(r2.config.endpoint)) {
      fail("probe_r2", new Error("R2_ENDPOINT rejected by shape check"));
    } else {
      try {
        await probeS3Compatible("r2", {
          accessKeyId: r2.config.accessKeyId,
          secretAccessKey: r2.config.secretAccessKey,
          bucket: r2.config.bucket,
          endpoint: r2.config.endpoint,
          region: r2.config.region,
        });
      } catch (error) {
        fail("probe_r2", error);
      }
    }
  } else {
    warn("probe_r2", "skipped (pass --probe-r2 after real credentials are set)");
  }

  if (probeResend) {
    const apiKey = process.env.RESEND_API_KEY?.trim() ?? "";
    if (!apiKey) {
      fail("probe_resend", new Error("RESEND_API_KEY missing — no invented key"));
    } else {
      try {
        const response = await fetch("https://api.resend.com/domains", {
          method: "GET",
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!response.ok) {
          throw new Error(`resend_http_${response.status} (domains list; no mail sent)`);
        }
        const payload = await response.json();
        const domains = Array.isArray(payload?.data) ? payload.data : [];
        const verified = domains.filter((d) => d?.status === "verified").length;
        ok(
          "probe_resend",
          `GET /domains ok domains=${domains.length} verified=${verified} (no email sent)`
        );
      } catch (error) {
        fail("probe_resend", error);
      }
    }
  } else {
    warn("probe_resend", "skipped (pass --probe-resend; never sends mail)");
  }

  console.log(
    process.exitCode
      ? "\nDone with failures. Fix ENV / provider setup; do not invent secrets."
      : "\nDone. Manual upload/download/invite/reset tests remain operator steps (see docs/)."
  );
}

main().catch((error) => {
  fail("fatal", error);
});
