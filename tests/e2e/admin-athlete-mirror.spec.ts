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

test("admin opens athlete preview and keeps admin session", async ({ page }, testInfo) => {
  await login(page, "admin@test.ur.local");
  await page.goto("/admin/preview?q=Athlete%20A");
  await expect(page.getByText("[QA] Athlete A").first()).toBeVisible();
  await page.getByRole("button", { name: "Abrir prévia" }).first().click();
  await expect(page).toHaveURL(/\/athlete$/);
  await expect(page.getByText("PRÉVIA DO ATLETA")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "[QA] Athlete A", exact: true }),
  ).toBeVisible();

  const navigationName =
    testInfo.project.name === "mobile"
      ? "Navegação principal do atleta"
      : "Navegação do atleta";
  const navigation = page.getByRole("navigation", { name: navigationName });

  await navigation.getByRole("link", { name: "Agenda", exact: true }).click();
  await expect(page).toHaveURL(/\/athlete\/agenda$/);
  await navigation.getByRole("link", { name: "Ranking", exact: true }).click();
  await expect(page).toHaveURL(/\/athlete\/ranking$/);
  await navigation.getByRole("link", { name: "Temporada", exact: true }).click();
  await expect(page).toHaveURL(/\/athlete\/season$/);
  await navigation.getByRole("link", { name: "Perfil", exact: true }).click();
  await expect(page).toHaveURL(/\/athlete\/profile$/);

  await page.goto("/athlete/arenas");
  await expect(page).toHaveURL(/\/athlete\/arenas$/);
  await expect(page.getByRole("heading", { name: "Onde a temporada acontece" })).toBeVisible();
  await expect(page.getByText("PRÉVIA DO ATLETA")).toBeVisible();

  await page.goto("/athlete/highlights");
  await expect(page).toHaveURL(/\/athlete\/highlights$/);
  await expect(page.getByRole("heading", { name: "Sua história dentro do UR" })).toBeVisible();
  await expect(page.getByText("PRÉVIA DO ATLETA")).toBeVisible();

  await page.goto("/athlete/development");
  await expect(page).toHaveURL(/\/athlete\/development$/);
  await expect(page.getByRole("heading", { name: "Sua progressão" })).toBeVisible();
  await expect(page.getByText("PRÉVIA DO ATLETA")).toBeVisible();

  await page.goto("/athlete/market");
  await expect(page).toHaveURL(/\/athlete\/market$/);
  await expect(page.getByRole("heading", { name: "Transforme participação em utilidade" })).toBeVisible();
  await expect(page.getByText("PRÉVIA DO ATLETA")).toBeVisible();

  await page.goto("/athlete/wallet");
  await expect(page).toHaveURL(/\/athlete\/wallet$/);
  await expect(page.getByRole("heading", { name: "Minha wallet" })).toBeVisible();
  await expect(page.getByText("PRÉVIA DO ATLETA")).toBeVisible();

  await page.getByRole("button", { name: "Voltar ao Controle" }).click();
  await expect(page).toHaveURL(/\/admin$/);
});

test("athlete cannot access admin preview selector", async ({ page }) => {
  await login(page, "athlete@test.ur.local");
  await page.goto("/admin/preview");
  await expect(page).toHaveURL(/\/athlete$/);
  await expect(page.getByText("Prévia do Atleta")).toHaveCount(0);
});
