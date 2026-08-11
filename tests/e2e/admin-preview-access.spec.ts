import { expect, test, type Page } from "@playwright/test";

const password = process.env.UR_TEST_PASSWORD ?? "";

if (!password) {
  throw new Error("UR_TEST_PASSWORD is required for authenticated E2E tests.");
}

async function loginAsAthlete(page: Page) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("athlete@test.ur.local");
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/athlete/, { timeout: 30_000 });
}

test("athlete cannot access the admin athlete Preview", async ({ page }) => {
  await loginAsAthlete(page);
  await page.goto("/admin/preview");

  await expect(page).toHaveURL(/\/athlete(?:\/)?$/, { timeout: 20_000 });
  await expect(
    page.getByRole("heading", { name: "Validar o App como atleta" }),
  ).toHaveCount(0);
  await expect(page.getByText(/Ultimate Rivals · Player Hub/i)).toBeVisible();
});
