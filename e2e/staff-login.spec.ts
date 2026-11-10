import { expect, test } from "@playwright/test";

test.describe("Mitarbeiter-Login (Demo)", () => {
  test("meldet Staff an und öffnet das Dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill("anna.recruiter@cms-platform.de");
    await page.getByLabel("Passwort").fill("demo1234");
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText(/Dashboard|Übersicht|Willkommen|Kandidaten/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
