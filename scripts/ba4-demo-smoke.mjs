/**
 * BA4 demo-mode smoke — no Neon required.
 * Verifies demo flag + in-memory CRM tables via demo store.
 *
 * Run: node --experimental-strip-types scripts/ba4-demo-smoke.mjs
 */
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const Module = require("module");
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  if (request === "next/headers") {
    return {
      cookies: () => ({
        get: () => undefined,
        set: () => undefined,
        delete: () => undefined,
      }),
    };
  }
  return originalLoad.apply(this, arguments);
};

process.env.NEXT_PUBLIC_DEMO_MODE = "true";
process.env.DEMO_SESSION_SECRET = process.env.DEMO_SESSION_SECRET ?? "d".repeat(40);
delete process.env.DATABASE_URL;

function ok(name, detail = "") {
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name, err) {
  console.error(`FAIL  ${name} — ${String(err?.message ?? err).slice(0, 240)}`);
  process.exitCode = 1;
}

async function main() {
  console.log("BA4 demo smoke (no Neon)");

  const { isDemoMode } = await import(
    pathToFileURL(path.join(process.cwd(), "lib/demo/mode.ts")).href
  );
  if (!isDemoMode()) fail("isDemoMode", new Error("expected true"));
  else ok("isDemoMode");

  const { getDemoStore } = await import(
    pathToFileURL(path.join(process.cwd(), "lib/demo/store.ts")).href
  );
  const store = getDemoStore();
  const tables = [
    "candidates",
    "companies",
    "vacancies",
    "contracts",
    "offers_calculations",
    "profiles",
    "vacancy_submissions",
    "activity_logs",
  ];
  for (const table of tables) {
    const rows = store[table];
    if (!Array.isArray(rows)) fail(`demo store ${table}`, new Error("missing array"));
    else ok(`demo store ${table}`, `count=${rows.length}`);
  }

  // Dual-mode query modules still gate on isDemoMode + createClient.
  const fs = await import("node:fs");
  for (const rel of [
    "lib/queries/candidates.ts",
    "lib/queries/companies.ts",
    "lib/queries/vacancies.ts",
    "lib/queries/contracts.ts",
    "lib/supabase/server.ts",
    "lib/supabase/client.ts",
  ]) {
    const src = fs.readFileSync(path.join(process.cwd(), rel), "utf8");
    if (rel.includes("supabase/")) {
      if (!src.includes("isDemoMode()") || !src.includes("throw new Error")) {
        fail(`demo gate ${rel}`, new Error("live throw / demo gate missing"));
      } else ok(`supabase gate ${path.basename(rel)}`);
    } else if (!src.includes("isDemoMode()") || !src.includes("createClient()")) {
      fail(`demo gate ${rel}`, new Error("demo branch missing"));
    } else {
      ok(`demo gate ${path.basename(rel)}`);
    }
  }

  const example = fs.readFileSync(path.join(process.cwd(), ".env.local.example"), "utf8");
  if (!example.includes("NEXT_PUBLIC_DEMO_MODE=false")) {
    fail("env example demo default", new Error("expected demo default false"));
  } else ok("env example demo default false");

  const policy = fs.readFileSync(path.join(process.cwd(), "lib/auth/route-policy.ts"), "utf8");
  if (!policy.includes("fail-closed") && !policy.includes("staff")) {
    fail("route policy", new Error("missing policy module"));
  } else ok("route policy present");

  if (process.exitCode) {
    console.error("BA4 demo smoke FAILED");
    process.exit(1);
  }
  console.log("BA4 demo smoke OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
