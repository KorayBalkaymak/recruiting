import fs from "node:fs";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

/**
 * Demo-mode browser E2E (no Neon, no Resend, no R2).
 *
 * Prerequisites:
 * 1. `npx playwright install chromium` (network)
 * 2. Demo build with NEXT_PUBLIC_DEMO_MODE=true (see docs/playwright.md)
 * 3. `npm run test:e2e`
 */
function resolveChromiumExecutable(): string | undefined {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) {
    return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  }
  const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!browsersPath || !fs.existsSync(browsersPath)) return undefined;

  // Prefer full Chrome for Testing when headless-shell arch mismatches (Cursor hosts).
  let versions: string[] = [];
  try {
    versions = fs
      .readdirSync(browsersPath)
      .filter((name) => name.startsWith("chromium-") && !name.includes("headless"));
  } catch {
    return undefined;
  }

  const candidates: string[] = [];
  for (const version of versions.sort().reverse()) {
    candidates.push(
      path.join(
        browsersPath,
        version,
        "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
      ),
      path.join(
        browsersPath,
        version,
        "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
      )
    );
  }
  return candidates.find((candidate) => fs.existsSync(candidate));
}

const chromiumExecutable = resolveChromiumExecutable();

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    ...devices["Desktop Chrome"],
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100",
    trace: "on-first-retry",
    headless: true,
    ...(chromiumExecutable
      ? { launchOptions: { executablePath: chromiumExecutable } }
      : {}),
  },
  webServer: {
    // Prefer `next start` over `next dev` to avoid Watchpack EMFILE on large trees.
    command: "npx next start -p 3100",
    url: "http://127.0.0.1:3100/login",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      // Fail-closed demo isolation: never hit Neon / live mail / R2 during E2E.
      NEXT_PUBLIC_DEMO_MODE: "true",
      DEMO_SESSION_SECRET: "playwright-e2e-demo-session-secret-32chars!",
      BETTER_AUTH_SECRET: "playwright-e2e-better-auth-secret-32chars!",
      BETTER_AUTH_URL: "http://127.0.0.1:3100",
      NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3100",
      DATABASE_URL: "",
      RESEND_API_KEY: "",
      EMAIL_FROM: "",
      R2_ACCOUNT_ID: "",
      R2_ACCESS_KEY_ID: "",
      R2_SECRET_ACCESS_KEY: "",
      R2_BUCKET: "",
      R2_ENDPOINT: "",
      B2_KEY_ID: "",
      B2_APPLICATION_KEY: "",
      B2_BUCKET_NAME: "",
      B2_ENDPOINT: "",
      B2_REGION: "",
    },
  },
});
