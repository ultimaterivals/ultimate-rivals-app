import { expect, test, type Page } from "@playwright/test";

const password = process.env.UR_TEST_PASSWORD ?? "";
const mobileViewports = [
  { name: "375x667", width: 375, height: 667 },
  { name: "390x844", width: 390, height: 844 },
  { name: "412x915", width: 412, height: 915 },
] as const;

if (!password) {
  throw new Error("UR_TEST_PASSWORD is required for authenticated E2E tests.");
}

async function login(
  page: Page,
  email = "athlete@test.ur.local",
  expectedPath = /\/athlete/,
) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(expectedPath, { timeout: 30_000 });
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
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
    { label: "Jogar", path: /\/athlete\/agenda/ },
    { label: "Ranking", path: /\/athlete\/ranking/ },
    { label: "Hunter", path: /\/athlete\/hunter/ },
    { label: "Perfil", path: /\/athlete\/perfil/ },
    { label: "Início", path: /\/athlete$/ },
  ]) {
    await navigation.getByRole("link", { name: destination.label }).click();
    await expect(page).toHaveURL(destination.path, { timeout: 20_000 });
  }

  const contextNavigation = page.getByRole("navigation", {
    name: "Atalhos da área atual",
  });
  await expect(contextNavigation).toBeVisible();
  await expect(
    contextNavigation.getByRole("link", { name: "Temporada" }),
  ).toBeVisible();
  await expect(
    contextNavigation.getByRole("link", { name: "Resultados" }),
  ).toBeVisible();
  await expect(
    contextNavigation.getByRole("link", { name: "Evolução" }),
  ).toBeVisible();
  await expect(
    contextNavigation.getByRole("link", { name: "Equipe" }),
  ).toBeVisible();
  await expect(
    contextNavigation.getByRole("link", { name: "Destaques" }),
  ).toBeVisible();
});

test("Athlete App and Command preserve critical mobile navigation at approved viewports", async ({
  page,
}) => {
  for (const viewport of mobileViewports) {
    await page.setViewportSize(viewport);
    await login(page);

    for (const path of [
      "/athlete",
      "/athlete/agenda",
      "/athlete/ranking",
      "/athlete/perfil",
      "/athlete/wallet",
    ]) {
      await page.goto(path);
      await expectNoHorizontalOverflow(page);
    }

    const athleteNavigation = page.getByRole("navigation", {
      name: "Navegação principal do atleta",
    });
    await expect(athleteNavigation).toBeVisible();
    const playLink = athleteNavigation.getByRole("link", { name: "Jogar" });
    await expect
      .poll(async () =>
        playLink.evaluate((element) =>
          Number.parseFloat(getComputedStyle(element).minHeight),
        ),
      )
      .toBeGreaterThanOrEqual(64);

    await login(page, "admin@test.ur.local", /\/admin/);
    await expectNoHorizontalOverflow(page);
    const menu = page.getByRole("button", { name: "Abrir navegação" });
    await expect(menu).toBeVisible();
    await menu.click();
    const dialog = page.getByRole("dialog", { name: "Menu de navegação" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("link", { name: /UR Play/i }).click();
    await expect(page).toHaveURL(/\/admin\/ur-play/, { timeout: 20_000 });
    await expectNoHorizontalOverflow(page);
    await page.goto("/admin/ur-play/quadra");
    await expect(
      page.getByRole("heading", { name: "Operação de quadra" }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }
});
