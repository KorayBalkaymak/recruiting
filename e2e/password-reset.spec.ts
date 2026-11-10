import { expect, test } from "@playwright/test";

test.describe("Passwort-Reset-Grundablauf (Demo)", () => {
  test("Kandidaten-Login führt zum Reset-Formular ohne echten Mailversand", async ({ page }) => {
    await page.goto("/candidate/login");
    await page.getByRole("link", { name: /Passwort vergessen/i }).click();
    await expect(page).toHaveURL(/\/login\/forgot-password\?from=candidate/);
    await expect(page.getByRole("heading", { name: /Passwort zurücksetzen/i })).toBeVisible();

    await page.locator('input[type="email"]').fill("kandidat@example.com");
    await page.getByRole("button", { name: /Link anfordern/i }).click();

    // Demo soft-succeeds without Resend; same enumeration-safe message.
    await expect(page.getByText(/Wenn ein Konto mit dieser E-Mail existiert/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByRole("link", { name: /Zurück zur Kandidaten-Anmeldung/i })
    ).toBeVisible();
  });

  test("Staff-Forgot-Password-Seite ist erreichbar", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: /Passwort vergessen/i }).click();
    await expect(page).toHaveURL(/\/login\/forgot-password/);
    await page.locator('input[type="email"]').fill("anna.recruiter@cms-platform.de");
    await page.getByRole("button", { name: /Link anfordern/i }).click();
    await expect(page.getByText(/Wenn ein Konto mit dieser E-Mail existiert/i)).toBeVisible({
      timeout: 15_000,
    });
  });
});
