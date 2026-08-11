import { expect, test, type Page } from "@playwright/test";

const password = process.env.UR_TEST_PASSWORD ?? "";

if (!password) {
  throw new Error("UR_TEST_PASSWORD is required for authenticated E2E tests.");
}

async function login(page: Page) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("athlete@test.ur.local");
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/athlete/, { timeout: 30_000 });
}

test("athlete mobile navigation preserves the dedicated App experience", async ({
  page,
}) => {
  await login(page);

  const navigation = page.getByRole("navigation", {
    name: "Navegação principal do atleta",
  });
  await expect(navigation).toBeVisible();

  for (const destination of [
    { label: "Agenda", path: /\/athlete\/agenda/ },
    { label: "Disponibilidade", path: /\/athlete\/disponibilidade/ },
    { label: "Ranking", path: /\/athlete\/ranking/ },
    { label: "Perfil", path: /\/athlete\/perfil/ },
    { label: "Início", path: /\/athlete$/ },
  ]) {
    await navigation.getByRole("link", { name: destination.label }).click();
    await expect(page).toHaveURL(destination.path, { timeout: 20_000 });
  }
});
