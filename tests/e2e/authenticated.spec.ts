import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const password = process.env.UR_TEST_PASSWORD ?? "";
if (!password)
  throw new Error("UR_TEST_PASSWORD is required for authenticated E2E tests.");

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

test("admin signs in and creates a development pole", async ({
  page,
}, testInfo) => {
  await login(page, "admin@test.ur.local");
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/poles");
  const suffix = `${testInfo.project.name}-${Date.now()}`.toLowerCase();
  await page.getByLabel("Nome").fill(`[TEST] Playwright ${suffix}`);
  await page.getByLabel("Slug").fill(`playwright-${suffix}`);
  await page.getByLabel("Cidade").fill("Betim");
  await page.getByLabel("UF").fill("MG");
  await page.getByRole("button", { name: "Criar" }).click({ force: true });
  await expect(page.getByText("Polo criado.")).toBeVisible();
  await expect(page.getByText(`[TEST] Playwright ${suffix}`)).toBeVisible();
});

test("athlete signs in, sees own profile and cannot access admin", async ({
  page,
}) => {
  await login(page, "athlete@test.ur.local");
  await expect(page).toHaveURL(/\/athlete$/);
  await page.goto("/athlete/profile");
  await expect(
    page.getByRole("heading", { name: "Test Athlete 01" }),
  ).toBeVisible();
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/athlete$/);
});

test("team manager cannot access global admin", async ({ page }) => {
  await login(page, "teammanager@test.ur.local");
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/$/);
});
