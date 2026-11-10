import { expect, test } from "@playwright/test";

test.describe("Kandidatenregistrierung und Login (Demo)", () => {
  test("registriert einen neuen Kandidaten und loggt erneut ein", async ({ page }) => {
    const email = `e2e.candidate.${Date.now()}@example.com`;
    const password = "demo1234xx";

    await page.goto("/candidate/register");
    await page.getByLabel("Vollständiger Name").fill("E2E Kandidat");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(password);
    await page.getByRole("button", { name: "Registrieren" }).click();
    await expect(page).toHaveURL(/\/candidate\/dashboard/, { timeout: 15_000 });

    await page.context().clearCookies();
    await page.goto("/candidate/login");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(password);
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).toHaveURL(/\/candidate\/dashboard/, { timeout: 15_000 });
  });
});
