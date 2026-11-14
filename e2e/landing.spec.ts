import { expect, test } from "@playwright/test";

test.describe("Öffentliche Startseite", () => {
  test("zeigt CMS Talents und beide Zugänge", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Talente, die zum Geschäft passen/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Recruiter$/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Kandidaten/ }).first()).toBeVisible();
    await page.getByRole("link", { name: /Recruiter-Bereich|Anmelden/ }).first().click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: /Recruiter-Anmeldung/i })).toBeVisible();
  });

  test("Kandidaten-Login ist vom Recruiter-Login getrennt", async ({ page }) => {
    await page.goto("/candidate/login");
    await expect(page.getByRole("heading", { name: /Kandidaten-Anmeldung/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Registrieren/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Anmelden" })).toBeVisible();
  });
});

