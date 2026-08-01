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
  await expect(page).not.toHaveURL(/\/login$/, { timeout: 20_000 });
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

test("admin completes Athlete 360 lifecycle", async ({ page }, testInfo) => {
  await login(page, "admin@test.ur.local");
  await page.goto("/admin/athletes");
  await page.getByLabel("Buscar atletas").fill("UR-");
  await page.getByRole("button", { name: "Filtrar" }).click();
  await expect(page.getByText(/cadastros encontrados/)).toBeVisible();
  await page.getByRole("link", { name: "Novo atleta" }).click();
  const suffix = `${testInfo.project.name}-${Date.now()}`;
  await page.getByLabel("Nome completo").fill(`[TEST] Fictitious ${suffix}`);
  await page.getByLabel("Nome público").fill(`[TEST] ${suffix}`);
  await page.getByRole("button", { name: "Cadastrar atleta" }).click();
  await expect(page).toHaveURL(/\/admin\/athletes\/[a-f0-9-]+$/, {
    timeout: 20_000,
  });
  await expect(page.getByText(/^UR-\d{6}$/)).toBeVisible();
  await page.getByRole("button", { name: "Arquivar" }).click();
  await expect(page.getByRole("button", { name: "Reativar" })).toBeVisible();
  await page.getByRole("button", { name: "Reativar" }).click();
  await expect(page.getByRole("button", { name: "Arquivar" })).toBeVisible();
});

test("athlete edits only permitted profile data", async ({ page }) => {
  await login(page, "athlete@test.ur.local");
  await page.goto("/athlete/profile");
  await page.getByRole("link", { name: "Editar meu perfil" }).click();
  await page.getByLabel("Bio esportiva").fill("[TEST] Bio esportiva E2E");
  await page.getByRole("button", { name: "Salvar perfil" }).click();
  await expect(page).toHaveURL(/\/athlete\/profile\?updated=1$/, {
    timeout: 20_000,
  });
  await expect(page.getByText("Perfil atualizado.")).toBeVisible();
  await page.goto("/admin/athletes");
  await expect(page).toHaveURL(/\/athlete$/);
});
