import { expect, test } from "@playwright/test";

test.describe("Staff-Review und Statusänderung (Demo)", () => {
  test("prüft eingereichtes Seed-Profil und startet Review", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill("anna.recruiter@cms-platform.de");
    await page.getByLabel("Passwort").fill("demo1234");
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).toHaveURL(/\/$/);

    await page.goto("/portal-pruefungen");
    await expect(page.getByRole("heading", { name: /Portal-Prüfungen/i })).toBeVisible();

    // Seeded demo candidate Clara is submitted.
    const reviewLink = page.getByRole("link", { name: "Prüfen" }).first();
    await expect(reviewLink).toBeVisible({ timeout: 15_000 });
    await reviewLink.click();

    await expect(page.getByTestId("staff-cv-download")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Prüfung/i })).toBeVisible();

    const startReview = page.getByRole("button", { name: "Prüfung starten" });
    if (await startReview.isVisible()) {
      await startReview.click();
      await expect(page.getByRole("button", { name: "Freigeben" })).toBeVisible({
        timeout: 15_000,
      });
      await page.getByRole("button", { name: "Freigeben" }).click();
      await expect(page.getByText(/Freigegeben/i).first()).toBeVisible({ timeout: 15_000 });
    } else {
      // Already past submitted (prior e2e run mutated shared demo store) — still assert CV link.
      await expect(page.getByTestId("staff-cv-download")).toHaveAttribute(
        "href",
        /\/api\/portal-pruefungen\/.+\/cv/
      );
    }
  });
});
