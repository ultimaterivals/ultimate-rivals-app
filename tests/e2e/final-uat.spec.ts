import { expect, test, type Page } from "@playwright/test";

const password = process.env.UR_TEST_PASSWORD ?? "";

if (!password) {
  throw new Error("UR_TEST_PASSWORD is required for final UAT.");
}

const athleteRoutes = [
  { label: "Home", path: "/athlete" },
  { label: "Agenda", path: "/athlete/agenda" },
  { label: "Disponibilidade", path: "/athlete/disponibilidade" },
  { label: "Resultados atuais e Histórico", path: "/athlete/results" },
  { label: "Ranking", path: "/athlete/ranking" },
  { label: "Temporada", path: "/athlete/season" },
  { label: "Development", path: "/athlete/development" },
  { label: "Equipe", path: "/athlete/team" },
  { label: "Wallet", path: "/athlete/wallet" },
  { label: "Market", path: "/athlete/market" },
  { label: "Arenas", path: "/athlete/arenas" },
  { label: "Destaques", path: "/athlete/highlights" },
  { label: "Perfil", path: "/athlete/perfil" },
  { label: "Feedback", path: "/athlete/feedback" },
] as const;

async function login(
  page: Page,
  email: "athlete@test.ur.local" | "admin@test.ur.local",
  expectedPath: RegExp,
) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(expectedPath, { timeout: 30_000 });
}

async function expectHealthyPage(page: Page, path: string) {
  const response = await page.goto(path);
  expect(
    response?.status(),
    `${path} should not return an HTTP error`,
  ).toBeLessThan(400);
  await expect(page).toHaveURL(new RegExp(`${path.replaceAll("/", "\\/")}$`), {
    timeout: 20_000,
  });
  await expect(page.locator("main")).toBeVisible();
  await expect(page.locator("h1").first()).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Application error");
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

test("real athlete completes the final desktop UAT route matrix", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login(page, "athlete@test.ur.local", /\/athlete/);

  for (const route of athleteRoutes) {
    await test.step(route.label, async () => {
      await expectHealthyPage(page, route.path);
      await expectNoHorizontalOverflow(page);
    });
  }

  await page.goto("/athlete/results");
  await expect(
    page.getByRole("heading", { name: "Seus jogos oficiais" }),
  ).toBeVisible();
  await expect(
    page.getByText("Histórico validado", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Jogos do seu histórico UR" }),
  ).toBeVisible();
});

test("real athlete completes the final mobile UAT route matrix", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "athlete@test.ur.local", /\/athlete/);

  for (const route of athleteRoutes) {
    await test.step(route.label, async () => {
      await expectHealthyPage(page, route.path);
      await expectNoHorizontalOverflow(page);
    });
  }

  await expect(
    page.getByRole("navigation", { name: "Navegação principal do atleta" }),
  ).toBeVisible();
});

test("admin-athlete surfaces and read-only Preview pass desktop UAT", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login(page, "admin@test.ur.local", /\/admin/);

  await page.goto("/admin/atletas");
  await expect(page).toHaveURL(/\/admin\/atletas/);
  await expect(page.locator("main")).toBeVisible();
  await expect(page.locator("h1").first()).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto("/admin/preview");
  await expect(
    page.getByRole("heading", { name: "Validar o App como atleta" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Abrir prévia" }).first().click();
  await expect(page).toHaveURL(/\/athlete$/, { timeout: 20_000 });
  await expect(
    page.getByText("Prévia do Atleta · somente leitura"),
  ).toBeVisible();

  for (const route of athleteRoutes.filter(
    (candidate) => candidate.path !== "/athlete/feedback",
  )) {
    await test.step(`Preview · ${route.label}`, async () => {
      await expectHealthyPage(page, route.path);
      await expect(
        page.getByText("Prévia do Atleta · somente leitura"),
      ).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });
  }

  await page.goto("/athlete/feedback");
  await expect(page).toHaveURL(/\/admin\/preview$/, { timeout: 20_000 });
});

test("admin Preview remains usable and read-only on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "admin@test.ur.local", /\/admin/);
  await page.goto("/admin/preview");
  await expectNoHorizontalOverflow(page);
  await page.getByRole("button", { name: "Abrir prévia" }).first().click();
  await expect(page).toHaveURL(/\/athlete$/, { timeout: 20_000 });
  await expect(
    page.getByText("Prévia do Atleta · somente leitura"),
  ).toBeVisible();

  for (const path of [
    "/athlete",
    "/athlete/agenda",
    "/athlete/results",
    "/athlete/ranking",
    "/athlete/season",
    "/athlete/team",
    "/athlete/wallet",
    "/athlete/market",
    "/athlete/perfil",
  ]) {
    await expectHealthyPage(page, path);
    await expectNoHorizontalOverflow(page);
  }
});
