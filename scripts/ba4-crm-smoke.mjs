/**
 * BA4 CRM cutover smoke (ba3-test only).
 * - createClient() live-throw contract
 * - CRM tables readable via Neon
 * Never prints secrets.
 *
 * Run: node scripts/ba4-crm-smoke.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Module = require("module");
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad.apply(this, arguments);
};

function loadEnvLocal() {
  const p = path.join(process.cwd(), ".env.local");
  for (const line of fs.readFileSync(p, "utf8").split(/\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i);
    const v = t.slice(i + 1);
    if (process.env[k] == null) process.env[k] = v;
  }
}

function assertBa3TestUrl(url) {
  const u = new URL(url.replace(/^postgresql:/, "http:").replace(/^postgres:/, "http:"));
  if (!u.hostname.startsWith("ep-calm-art-")) {
    throw new Error("Abort: DATABASE_URL host is not ba3-test compute.");
  }
  if (u.pathname.replace(/^\//, "") !== "neondb") {
    throw new Error("Abort: database name is not neondb.");
  }
  return u.hostname.split(".")[0];
}

function ok(name, detail = "") {
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name, err) {
  console.error(`FAIL  ${name} — ${String(err?.message ?? err).slice(0, 240)}`);
  process.exitCode = 1;
}

async function main() {
  loadEnvLocal();
  process.env.NEXT_PUBLIC_DEMO_MODE = "false";
  const host = assertBa3TestUrl(process.env.DATABASE_URL);
  console.log(`BA4 CRM smoke on ${host} / neondb`);

  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL);

  const checks = [
    ["profiles", () => sql`select count(*)::int as n from profiles`],
    ["candidates", () => sql`select count(*)::int as n from candidates`],
    ["companies", () => sql`select count(*)::int as n from companies`],
    ["vacancies", () => sql`select count(*)::int as n from vacancies`],
    ["vacancy_submissions", () => sql`select count(*)::int as n from vacancy_submissions`],
    ["contracts", () => sql`select count(*)::int as n from contracts`],
    ["offers_calculations", () => sql`select count(*)::int as n from offers_calculations`],
    ["activity_logs", () => sql`select count(*)::int as n from activity_logs`],
    ["v_companies_active", () => sql`select count(*)::int as n from v_companies_active`],
  ];

  for (const [name, run] of checks) {
    try {
      const rows = await run();
      ok(`select ${name}`, `count=${rows[0].n}`);
    } catch (e) {
      fail(`select ${name}`, e);
    }
  }

  try {
    const { isDemoMode } = await import(
      pathToFileURL(path.join(process.cwd(), "lib/demo/mode.ts")).href
    );
    if (isDemoMode()) fail("live mode", new Error("isDemoMode unexpectedly true"));
    else ok("live mode active");
  } catch (e) {
    fail("live mode", e);
  }

  const serverSrc = fs.readFileSync(path.join(process.cwd(), "lib/supabase/server.ts"), "utf8");
  if (!serverSrc.includes("Live-Modus nicht verfügbar") || !serverSrc.includes("throw new Error")) {
    fail("createClient live throw", new Error("throw contract missing in server.ts"));
  } else {
    ok("createClient live throw contract");
  }

  const queryFiles = [
    "lib/queries/candidates.ts",
    "lib/queries/companies.ts",
    "lib/queries/vacancies.ts",
    "lib/queries/contracts.ts",
  ];
  for (const rel of queryFiles) {
    const src = fs.readFileSync(path.join(process.cwd(), rel), "utf8");
    if (!src.includes("getDb()") || !src.includes("isDemoMode()")) {
      fail(`dual-mode ${rel}`, new Error("missing getDb/isDemoMode"));
    } else {
      ok(`dual-mode ${rel}`);
    }
  }

  const actionFiles = [
    "app/(app)/kandidaten/actions.ts",
    "app/(app)/kunden/actions.ts",
    "app/(app)/vakanzen/actions.ts",
    "app/(app)/vertraege/actions.ts",
    "app/(app)/rechner/actions.ts",
  ];
  for (const rel of actionFiles) {
    const src = fs.readFileSync(path.join(process.cwd(), rel), "utf8");
    if (!src.includes("getDb()") || !src.includes("isDemoMode()")) {
      fail(`action dual-mode ${rel}`, new Error("missing getDb/isDemoMode"));
    } else {
      ok(`action dual-mode ${path.basename(path.dirname(rel))}`);
    }
  }

  if (process.exitCode) {
    console.error("BA4 CRM smoke FAILED");
    process.exit(1);
  }
  console.log("BA4 CRM smoke OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
