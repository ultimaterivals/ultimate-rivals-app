import { expect, test } from "@playwright/test";

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const hasAdminCredentials = Boolean(adminEmail && adminPassword);

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(adminEmail ?? "");
  await page.getByLabel("Senha").fill(adminPassword ?? "");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/admin(?:\/|$)/);
}

test.describe("Command Center autenticado", () => {
  test.skip(
    !hasAdminCredentials,
    "Defina E2E_ADMIN_EMAIL e E2E_ADMIN_PASSWORD para homologar o Command com uma conta administrativa real.",
  );

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("carrega a sala de controle sem overflow horizontal", async ({
    page,
  }) => {
    await page.goto("/admin");

    await expect(
      page.getByRole("heading", { name: "Command Center" }),
    ).toBeVisible();
    await expect(page.getByText("Sala de controle · Hoje")).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );

    expect(hasHorizontalOverflow).toBe(false);
  });

  test("preserva as camadas executivas e operacionais da C42", async ({
    page,
  }) => {
    await page.goto("/admin");

    await expect(page.getByText("Sala de controle · Hoje")).toBeVisible();
    await expect(page.getByText("Ciclo operacional UR Play")).toBeVisible();
    await expect(page.getByText("Economia das sessões")).toBeVisible();
    await expect(page.getByText("Mapa do ecossistema")).toBeVisible();
  });

  test("abre as rotas críticas do ciclo UR Play", async ({ page }) => {
    const routes = [
      "/admin/ur-play",
      "/admin/ur-play/presenca",
      "/admin/ur-play/quadra",
      "/admin/ur-play/fechamento",
      "/admin/ur-play/pos-sessao",
    ];

    for (const route of routes) {
      const response = await page.goto(route);
      expect(response?.status()).toBeLessThan(500);
      await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
    }
  });
});
