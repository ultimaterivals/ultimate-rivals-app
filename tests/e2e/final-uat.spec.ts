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
  { label: "Hunter", path: "/athlete/hunter" },
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

async function expectDevelopmentEvidence(page: Page) {
  await page.goto("/athlete/development");
  await expect(
    page.getByRole("heading", { name: "Como seu jogo está avançando" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Seu momento em números" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Ações registradas nas partidas do app",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Série histórica ainda não publicada" }),
  ).toBeVisible();
  await expect(
    page.getByText(/Hunter é a escola de desenvolvimento opt-in/),
  ).toBeVisible();
  await expect(
    page.getByText(/score, radar ou diagnóstico automático/),
  ).toBeVisible();
}

async function expectHunterSkeleton(page: Page) {
  await page.goto("/athlete/hunter");
  await expect(
    page.getByRole("heading", {
      name: "Desenvolvimento para quem quer ir além do jogo.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Adesão ainda não conectada ao Athlete App" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Quatro trilhas de desenvolvimento" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Quatro estados, sem progresso inventado" }),
  ).toBeVisible();
  await expect(
    page.getByText(/o App não presume estado e não grava interesse em uma fonte provisória/),
  ).toBeVisible();
  await expect(
    page.getByText(/nenhuma nota, missão, porcentagem ou recomendação é calculada automaticamente/),
  ).toBeVisible();
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
    page.getByRole("heading", { name: "Jogos atuais" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Sua trajetória antes do app" }),
  ).toBeVisible();
  await expect(
    page.getByText("Não alteram automaticamente ranking ou UR Coins.", {
      exact: true,
    }),
  ).toBeVisible();

  await expectDevelopmentEvidence(page);
  await expectNoHorizontalOverflow(page);
  await expectHunterSkeleton(page);
  await expectNoHorizontalOverflow(page);
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

  await expectDevelopmentEvidence(page);
  await expectNoHorizontalOverflow(page);
  await expectHunterSkeleton(page);
  await expectNoHorizontalOverflow(page);
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

  await expectHunterSkeleton(page);
  await expect(
    page.getByText("Prévia do Atleta · somente leitura"),
  ).toBeVisible();

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
    "/athlete/development",
    "/athlete/hunter",
    "/athlete/team",
    "/athlete/wallet",
    "/athlete/market",
    "/athlete/perfil",
  ]) {
    await expectHealthyPage(page, path);
    await expectNoHorizontalOverflow(page);
  }

  await expectHunterSkeleton(page);
  await expectNoHorizontalOverflow(page);
  await expect(
    page.getByText("Prévia do Atleta · somente leitura"),
  ).toBeVisible();
});
