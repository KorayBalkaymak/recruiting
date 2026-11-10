/**
 * Single-process Demo E2E smoke (no Playwright worker / no Neon / no mail).
 * Useful when `npx playwright test` cannot launch Chromium in a restricted host.
 *
 * Prerequisites: demo `next start` on :3100, PLAYWRIGHT_CHROMIUM_EXECUTABLE set.
 */
import { chromium } from "@playwright/test";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3100";
const exe = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;

const results = [];

function pass(name) {
  results.push({ name, ok: true });
  console.log(`PASS  ${name}`);
}
function fail(name, err) {
  results.push({ name, ok: false, err: String(err?.message || err) });
  console.error(`FAIL  ${name} — ${err?.message || err}`);
}

const browser = await chromium.launch({
  headless: true,
  executablePath: exe || undefined,
});
const page = await browser.newPage();

try {
  // 1) Staff login
  try {
    await page.goto(`${base}/login`);
    await page.getByLabel("E-Mail").fill("anna.recruiter@cms-platform.de");
    await page.getByLabel("Passwort").fill("demo1234");
    await page.getByRole("button", { name: "Anmelden" }).click();
    await page.waitForURL((url) => url.pathname === "/" || url.pathname === "", {
      timeout: 15000,
    });
    pass("staff-login");
  } catch (e) {
    fail("staff-login", e);
  }

  // 2) Password reset from candidate login
  try {
    await page.context().clearCookies();
    await page.goto(`${base}/candidate/login`);
    await page.getByRole("link", { name: /Passwort vergessen/i }).click();
    await page.waitForURL(/forgot-password\?from=candidate/);
    await page.locator('input[type="email"]').fill("kandidat@example.com");
    await page.getByRole("button", { name: /Link anfordern/i }).click();
    await page.getByText(/Wenn ein Konto mit dieser E-Mail existiert/i).waitFor({
      timeout: 15000,
    });
    pass("password-reset-candidate");
  } catch (e) {
    fail("password-reset-candidate", e);
  }

  // 3) Candidate register + login
  const email = `e2e.smoke.${Date.now()}@example.com`;
  const password = "demo1234xx";
  try {
    await page.context().clearCookies();
    await page.goto(`${base}/candidate/register`);
    await page.getByLabel("Vollständiger Name").fill("E2E Smoke");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(password);
    await page.getByRole("button", { name: "Registrieren" }).click();
    await page.waitForURL(/\/candidate\/dashboard/, { timeout: 15000 });
    await page.context().clearCookies();
    await page.goto(`${base}/candidate/login`);
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(password);
    await page.getByRole("button", { name: "Anmelden" }).click();
    await page.waitForURL(/\/candidate\/dashboard/, { timeout: 15000 });
    pass("candidate-register-login");
  } catch (e) {
    fail("candidate-register-login", e);
  }

  // 4) Profile submit
  try {
    await page.goto(`${base}/candidate/profile`);
    await page.getByLabel("Vorname").fill("E2E");
    await page.getByLabel("Nachname").fill("Smoke");
    await page.getByLabel(/Gewünschte Tätigkeit/i).fill("Frontend Engineer");
    await page.getByLabel(/Stadt/).fill("Berlin");
    await page.getByLabel(/Suchradius/i).fill("40");
    await page.getByLabel(/Skills/i).fill("React, TypeScript");
    await page.getByRole("button", { name: "Zur Prüfung einreichen" }).click();
    await page.getByText(/eingereicht/i).waitFor({ timeout: 15000 });
    pass("candidate-profile-submit");
  } catch (e) {
    fail("candidate-profile-submit", e);
  }

  // 5) Staff review + CV link
  try {
    await page.context().clearCookies();
    await page.goto(`${base}/login`);
    await page.getByLabel("E-Mail").fill("anna.recruiter@cms-platform.de");
    await page.getByLabel("Passwort").fill("demo1234");
    await page.getByRole("button", { name: "Anmelden" }).click();
    await page.waitForURL((url) => url.pathname === "/" || url.pathname === "", {
      timeout: 15000,
    });
    await page.goto(`${base}/portal-pruefungen`);
    await page.getByRole("link", { name: "Prüfen" }).first().click();
    await page.getByTestId("staff-cv-download").waitFor({ timeout: 15000 });
    const start = page.getByRole("button", { name: "Prüfung starten" });
    if (await start.isVisible()) {
      await start.click();
      await page.getByRole("button", { name: "Freigeben" }).waitFor({ timeout: 15000 });
      await page.getByRole("button", { name: "Freigeben" }).click();
      await page.getByText(/Freigegeben/i).first().waitFor({ timeout: 15000 });
    }
    pass("staff-review");
  } catch (e) {
    fail("staff-review", e);
  }
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\nSummary: ${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
