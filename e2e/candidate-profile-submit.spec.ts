import { expect, test } from "@playwright/test";

test.describe("Kandidatenprofil und Bewerbung (Demo)", () => {
  test("füllt Profil und reicht zur Prüfung ein", async ({ page }) => {
    const email = `e2e.profile.${Date.now()}@example.com`;
    const password = "demo1234xx";

    await page.goto("/candidate/register");
    await page.getByLabel("Vollständiger Name").fill("Profil Tester");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(password);
    await page.getByRole("button", { name: "Registrieren" }).click();
    await expect(page).toHaveURL(/\/candidate\/dashboard/, { timeout: 15_000 });

    await page.goto("/candidate/profile");
    await page.getByLabel("Vorname").fill("Profil");
    await page.getByLabel("Nachname").fill("Tester");
    await page.getByLabel(/Gewünschte Tätigkeit/i).fill("Frontend Engineer");
    await page.getByLabel(/Stadt/).fill("Berlin");
    await page.getByLabel(/Suchradius/i).fill("40");
    await page.getByLabel(/Skills/i).fill("React, TypeScript");
    await page.getByRole("button", { name: "Zur Prüfung einreichen" }).click();
    await expect(page.getByText(/eingereicht/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Eingereicht/i).first()).toBeVisible();
  });
});
