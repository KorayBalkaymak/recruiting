/**
 * Live B2 CV API integration (test accounts/files only).
 * Never prints secrets, emails, tokens, or storage keys in full.
 *
 * Usage: node scripts/b2-cv-api-integration.mjs
 * Expects Next.js on http://127.0.0.1:3000 with NEXT_PUBLIC_DEMO_MODE=false + B2 env.
 */
import { createRequire } from "node:module";
import { randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const require = createRequire(import.meta.url);
const Module = require("module");
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  if (request === "next/headers") {
    return {
      cookies: () => ({ get: () => undefined, set: () => undefined, delete: () => undefined }),
      headers: () => new Headers(),
    };
  }
  return originalLoad.apply(this, arguments);
};

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

function loadEnvLocal() {
  const envPath = path.join(rootDir, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    const existing = process.env[key];
    // Do not override non-empty env; allow filling blanks (e.g. truncated shell exports).
    if (typeof existing === "string" && existing.trim() !== "") continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvLocal();
process.env.NEXT_PUBLIC_DEMO_MODE = "false";
if (!process.env.DATABASE_URL?.trim()) {
  console.error("FAIL  env — DATABASE_URL missing after loading .env.local");
  process.exit(1);
}

function ok(name, detail = "") {
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name, err) {
  const msg = String(err?.message ?? err).slice(0, 200);
  console.error(`FAIL  ${name} — ${msg}`);
  process.exitCode = 1;
}

function minimalPdf() {
  // Valid tiny PDF for magic-byte validation.
  return Buffer.from(
    `%PDF-1.1
1 0 obj<<>>endobj
2 0 obj<< /Length 44 >>stream
BT /F1 12 Tf 100 700 Td (B2 CV test) Tj ET
endstream
endobj
3 0 obj<< /Type /Page /Parent 4 0 R /Contents 2 0 R >>endobj
4 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 /MediaBox [0 0 612 792] >>endobj
5 0 obj<< /Type /Catalog /Pages 4 0 R >>endobj
xref
0 6
0000000000 65535 f\x20
0000000009 00000 n\x20
0000000024 00000 n\x20
0000000112 00000 n\x20
0000000180 00000 n\x20
0000000269 00000 n\x20
trailer<< /Size 6 /Root 5 0 R >>
startxref
340
%%EOF
`,
    "utf8"
  );
}

function cookieHeader(cookies) {
  return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

async function registerCandidate(page, email, password, fullName) {
  await page.goto(`${baseURL}/candidate/register`);
  await page.getByLabel("Vollständiger Name").fill(fullName);
  await page.getByLabel("E-Mail").fill(email);
  await page.getByLabel("Passwort").fill(password);
  await page.getByRole("button", { name: "Registrieren" }).click();
  await page.waitForURL(/\/candidate\/(dashboard|profile|login)/, { timeout: 30_000 });
  if (page.url().includes("/candidate/login")) {
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(password);
    await page.getByRole("button", { name: "Anmelden" }).click();
    await page.waitForURL(/\/candidate\/dashboard/, { timeout: 30_000 });
  }
}

async function main() {
  console.log("B2 CV API integration (test accounts only; no secret output)");

  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    fail("mode", new Error("NEXT_PUBLIC_DEMO_MODE must be false for live B2"));
    return;
  }

  const stamp = Date.now();
  const password = `T${randomBytes(9).toString("base64url")}a1`;
  const emailA = `b2.cv.a.${stamp}@example.com`;
  const emailB = `b2.cv.b.${stamp}@example.com`;
  const staffEmail = `b2.cv.staff.${stamp}@example.com`;
  const pdf = minimalPdf();
  const pdfPath = path.join(rootDir, `.tmp-b2-cv-${stamp}.pdf`);
  fs.writeFileSync(pdfPath, pdf);

  let storagePath = null;
  let candidateIdA = null;
  let documentId = null;
  const cleanupIds = { accountIds: [], candidateIds: [], userIds: [] };

  const { readB2ConfigFromEnv } = await import(
    pathToFileURL(path.join(rootDir, "lib/storage/b2-config.ts")).href
  );
  const b2 = readB2ConfigFromEnv(process.env);
  if (!b2.ok) {
    fail("b2_config", new Error(`incomplete: ${[...b2.missing, ...b2.invalid].join(",")}`));
    return;
  }
  ok("b2_config", `bucket=${b2.config.bucket} region=${b2.config.region}`);

  const browser = await chromium.launch({ headless: true });
  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();

  try {
    // --- Candidate A register + upload via API ---
    await registerCandidate(pageA, emailA, password, "B2 CV Tester A");
    ok("candidate_a_session", "registered/logged in");

    const uploadRes = await pageA.request.post(`${baseURL}/api/candidate/cv`, {
      multipart: {
        file: {
          name: "b2-cv-test.pdf",
          mimeType: "application/pdf",
          buffer: pdf,
        },
      },
    });
    const uploadJson = await uploadRes.json().catch(() => ({}));
    if (!uploadRes.ok()) {
      throw new Error(`upload HTTP ${uploadRes.status()}: ${uploadJson.error ?? "unknown"}`);
    }
    documentId = uploadJson.documentId ?? null;
    ok("1_cv_upload", `HTTP ${uploadRes.status()} documentId=${documentId ? "present" : "missing"}`);

    // Resolve candidateId via Neon SQL (no drizzle ESM directory imports).
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(process.env.DATABASE_URL);
    const docs = await sql`
      SELECT id, candidate_id, storage_path, storage_bucket
      FROM candidate_documents
      WHERE id = ${documentId}
      LIMIT 1
    `;
    const docRow = docs[0];
    if (!docRow) throw new Error("document row missing after upload");
    candidateIdA = docRow.candidate_id;
    storagePath = docRow.storage_path;
    cleanupIds.candidateIds.push(candidateIdA);
    ok("upload_persisted", `bucket_ok=${docRow.storage_bucket === b2.config.bucket}`);

    // --- 2) Candidate self-download ---
    const selfDl = await pageA.request.get(`${baseURL}/api/candidate/cv`);
    const selfBody = Buffer.from(await selfDl.body());
    if (!selfDl.ok() || selfBody.subarray(0, 4).toString() !== "%PDF") {
      throw new Error(`self-download HTTP ${selfDl.status()} bytes=${selfBody.length}`);
    }
    const cd = selfDl.headers()["content-disposition"] ?? "";
    if (!/attachment/i.test(cd)) throw new Error("missing attachment disposition");
    ok("2_candidate_download", `HTTP ${selfDl.status()} pdf_magic=ok`);

    // Provision internal staff via isolated Node process (preload mock + tsx).
    const provisionFile = path.join(rootDir, `.tmp-b2-provision-staff-${stamp}.ts`);
    fs.writeFileSync(
      provisionFile,
      `
import { runAsInternalInvite } from "./lib/auth/invite-context.ts";
import { getAuth } from "./lib/auth/auth.ts";

async function main() {
  const email = process.env.B2_TEST_STAFF_EMAIL;
  const password = process.env.B2_TEST_STAFF_PASSWORD;
  if (!email || !password) throw new Error("missing staff test env");
  await runAsInternalInvite(async () => {
    await getAuth().api.signUpEmail({
      body: { email, password, name: "B2 CV Staff" },
    });
  });
  console.log("staff_ok");
}

main().catch((error) => {
  console.error(String(error?.message ?? error).slice(0, 200));
  process.exit(1);
});
`
    );
    const { spawnSync } = await import("node:child_process");
    const prov = spawnSync(
      process.execPath,
      [
        "--import",
        path.join(rootDir, "scripts/mock-server-only-preload.mjs"),
        "--import",
        "tsx",
        provisionFile,
      ],
      {
        cwd: rootDir,
        env: {
          ...process.env,
          B2_TEST_STAFF_EMAIL: staffEmail,
          B2_TEST_STAFF_PASSWORD: password,
          NEXT_PUBLIC_DEMO_MODE: "false",
        },
        encoding: "utf8",
      }
    );
    try {
      fs.unlinkSync(provisionFile);
    } catch {
      /* ignore */
    }
    if (prov.status !== 0 || !String(prov.stdout + prov.stderr).includes("staff_ok")) {
      throw new Error(
        `staff provision failed: ${String(prov.stderr || prov.stdout).slice(0, 220)}`
      );
    }
    const staffProfiles = await sql`
      SELECT id FROM profiles WHERE email = ${staffEmail} LIMIT 1
    `;
    if (staffProfiles[0]?.id) cleanupIds.userIds.push(staffProfiles[0].id);
    ok("staff_provisioned", "internal test staff created");

    const contextStaff = await browser.newContext();
    const pageStaff = await contextStaff.newPage();
    await pageStaff.goto(`${baseURL}/login`);
    await pageStaff.getByLabel("E-Mail").fill(staffEmail);
    await pageStaff.getByLabel("Passwort").fill(password);
    await pageStaff.getByRole("button", { name: "Anmelden" }).click();
    await pageStaff.waitForURL((u) => u.pathname === "/" || u.pathname === "", {
      timeout: 30_000,
    });

    const staffDl = await pageStaff.request.get(
      `${baseURL}/api/portal-pruefungen/${candidateIdA}/cv`
    );
    const staffBody = Buffer.from(await staffDl.body());
    if (!staffDl.ok() || staffBody.subarray(0, 4).toString() !== "%PDF") {
      throw new Error(`staff-download HTTP ${staffDl.status()} bytes=${staffBody.length}`);
    }
    ok("3_staff_download", `HTTP ${staffDl.status()} pdf_magic=ok`);
    await contextStaff.close();

    // --- 4) Foreign candidate denied ---
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await registerCandidate(pageB, emailB, password, "B2 CV Tester B");
    const candBRows = await sql`
      SELECT id FROM candidates WHERE email = ${emailB} LIMIT 1
    `;
    if (candBRows[0]?.id) cleanupIds.candidateIds.push(candBRows[0].id);

    const foreignStaffRoute = await pageB.request.get(
      `${baseURL}/api/portal-pruefungen/${candidateIdA}/cv`
    );
    if (![401, 403].includes(foreignStaffRoute.status())) {
      throw new Error(`expected 401/403 from staff CV route, got ${foreignStaffRoute.status()}`);
    }
    ok("4a_foreign_candidate_staff_route", `HTTP ${foreignStaffRoute.status()}`);

    const foreignSelf = await pageB.request.get(`${baseURL}/api/candidate/cv`);
    // B has no CV → 404; must not return A's PDF
    const foreignBody = Buffer.from(await foreignSelf.body());
    if (foreignSelf.status() === 200 && foreignBody.subarray(0, 4).toString() === "%PDF") {
      throw new Error("foreign candidate received a PDF via self-download");
    }
    if (![401, 403, 404].includes(foreignSelf.status())) {
      throw new Error(`unexpected self-download status ${foreignSelf.status()}`);
    }
    ok("4b_foreign_candidate_self_route", `HTTP ${foreignSelf.status()} (no foreign PDF)`);
    await contextB.close();

    // --- 5) Not publicly reachable ---
    const anon = await browser.newContext();
    const anonPage = await anon.newPage();
    const anonCand = await anonPage.request.get(`${baseURL}/api/candidate/cv`);
    const anonStaff = await anonPage.request.get(
      `${baseURL}/api/portal-pruefungen/${candidateIdA}/cv`
    );
    if (![401, 403].includes(anonCand.status())) {
      throw new Error(`anon candidate route expected 401/403 got ${anonCand.status()}`);
    }
    if (![401, 403].includes(anonStaff.status())) {
      throw new Error(`anon staff route expected 401/403 got ${anonStaff.status()}`);
    }
    ok("5a_unauthenticated_api", `candidate=${anonCand.status()} staff=${anonStaff.status()}`);

    // Direct public-style object URL (B2 S3 path) must not expose the object anonymously.
    const publicGuess = `${b2.config.endpoint.replace(/\/$/, "")}/${encodeURIComponent(b2.config.bucket)}/${storagePath
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`;
    const publicRes = await fetch(publicGuess, { method: "GET" });
    if (publicRes.ok) {
      throw new Error(`object reachable without auth HTTP ${publicRes.status}`);
    }
    ok("5b_public_object_url", `HTTP ${publicRes.status} (denied)`);
    await anon.close();
  } catch (error) {
    fail("integration", error);
  } finally {
    // --- 7) Cleanup test files/rows ---
    try {
      const { neon } = await import("@neondatabase/serverless");
      const sql = neon(process.env.DATABASE_URL);

      if (storagePath && b2.ok) {
        try {
          const { S3Client, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
          const client = new S3Client({
            region: b2.config.region,
            endpoint: b2.config.endpoint,
            credentials: {
              accessKeyId: b2.config.keyId,
              secretAccessKey: b2.config.applicationKey,
            },
            forcePathStyle: true,
          });
          await client.send(
            new DeleteObjectCommand({ Bucket: b2.config.bucket, Key: storagePath })
          );
          ok("cleanup_b2_object", "deleted");
        } catch (error) {
          fail("cleanup_b2_object", error);
        }
      }

      for (const candidateId of cleanupIds.candidateIds) {
        await sql`DELETE FROM candidate_documents WHERE candidate_id = ${candidateId}`;
        await sql`DELETE FROM candidate_profile_review_events WHERE candidate_id = ${candidateId}`;
        await sql`DELETE FROM candidate_portal_profiles WHERE candidate_id = ${candidateId}`;
        await sql`DELETE FROM candidate_search_profiles WHERE candidate_id = ${candidateId}`;
        await sql`DELETE FROM candidate_accounts WHERE candidate_id = ${candidateId}`;
        await sql`DELETE FROM candidates WHERE id = ${candidateId}`;
      }
      if (cleanupIds.candidateIds.length) {
        ok("cleanup_candidates", `count=${cleanupIds.candidateIds.length}`);
      }

      for (const userId of cleanupIds.userIds) {
        await sql`DELETE FROM session WHERE user_id = ${userId}`;
        await sql`DELETE FROM account WHERE user_id = ${userId}`;
        await sql`DELETE FROM profiles WHERE id = ${userId}`;
        await sql`DELETE FROM "user" WHERE id = ${userId}`;
      }
      if (cleanupIds.userIds.length) {
        ok("cleanup_staff_user", `count=${cleanupIds.userIds.length}`);
      }

      for (const email of [emailA, emailB]) {
        const users = await sql`SELECT id FROM "user" WHERE email = ${email}`;
        for (const u of users) {
          await sql`DELETE FROM session WHERE user_id = ${u.id}`;
          await sql`DELETE FROM account WHERE user_id = ${u.id}`;
          await sql`DELETE FROM "user" WHERE id = ${u.id}`;
        }
      }
      ok("cleanup_candidate_auth", "done");
    } catch (error) {
      fail("cleanup", error);
    }

    try {
      fs.unlinkSync(pdfPath);
    } catch {
      /* ignore */
    }
    await browser.close();
  }

  console.log(
    process.exitCode
      ? "\nIntegration finished with failures."
      : "\nIntegration finished successfully."
  );
}

main().catch((error) => {
  fail("fatal", error);
  process.exit(1);
});
