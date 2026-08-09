import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const password = process.env.UR_TEST_PASSWORD ?? "";
if (!password) throw new Error("UR_TEST_PASSWORD is required for authenticated E2E tests.");

async function login(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}

test("admin opens athlete mirror and keeps admin session", async ({ page }) => {
  await login(page, "admin@test.ur.local");
  await page.goto("/admin/mirror?q=Test%20Athlete%2001");
  await page.getByRole("button", { name: "Ver espelho" }).first().click();
  await expect(page).toHaveURL(/\/athlete$/);
  await expect(page.getByText("ESPELHO DO ATLETA")).toBeVisible();
  await expect(page.getByText("Test Athlete 01")).toBeVisible();
  await page.getByRole("link", { name: "Agenda" }).first().click();
  await expect(page).toHaveURL(/\/athlete\/agenda$/);
  await page.getByRole("link", { name: "Ranking" }).first().click();
  await expect(page).toHaveURL(/\/athlete\/ranking$/);
  await page.getByRole("link", { name: "Temporada" }).first().click();
  await expect(page).toHaveURL(/\/athlete\/season$/);
  await page.getByRole("link", { name: "Perfil" }).first().click();
  await expect(page).toHaveURL(/\/athlete\/profile$/);
  await page.getByRole("button", { name: "Voltar ao Controle" }).click();
  await expect(page).toHaveURL(/\/admin$/);
});

test("athlete cannot access admin mirror selector", async ({ page }) => {
  await login(page, "athlete@test.ur.local");
  await page.goto("/admin/mirror");
  await expect(page).toHaveURL(/\/athlete$/);
  await expect(page.getByText("Modo Espelho")).toHaveCount(0);
});
