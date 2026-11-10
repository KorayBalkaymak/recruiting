/**
 * Local Playwright runner that avoids Cursor sandbox SIGABRT on Chromium.
 * Usage: node --input-type=module scripts/run-playwright-e2e.mjs
 * Expects demo `next start` on :3100 (or starts via playwright webServer).
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function findChromium() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) {
    return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  }
  const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!browsersPath || !fs.existsSync(browsersPath)) return undefined;
  const versions = fs
    .readdirSync(browsersPath)
    .filter((name) => name.startsWith("chromium-") && !name.includes("headless"))
    .sort()
    .reverse();
  for (const version of versions) {
    for (const arch of ["chrome-mac-arm64", "chrome-mac-x64"]) {
      const candidate = path.join(
        browsersPath,
        version,
        arch,
        "Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
      );
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return undefined;
}

const chromium = findChromium();
const env = {
  ...process.env,
  CI: process.env.CI ?? "",
  DATABASE_URL: "",
  NEXT_PUBLIC_DEMO_MODE: "true",
  DEMO_SESSION_SECRET:
    process.env.DEMO_SESSION_SECRET || "playwright-e2e-demo-session-secret-32chars!",
  BETTER_AUTH_SECRET:
    process.env.BETTER_AUTH_SECRET || "playwright-e2e-better-auth-secret-32chars!",
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "http://127.0.0.1:3100",
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3100",
  RESEND_API_KEY: "",
  EMAIL_FROM: "",
};
if (chromium) env.PLAYWRIGHT_CHROMIUM_EXECUTABLE = chromium;

const cli = path.join(root, "node_modules/@playwright/test/cli.js");
const child = spawn(process.execPath, [cli, "test", ...process.argv.slice(2)], {
  cwd: root,
  env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`[run-playwright-e2e] killed by ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});
