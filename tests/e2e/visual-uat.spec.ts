import { mkdir } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

const password = process.env.UR_TEST_PASSWORD ?? "";
const evidenceDir = "test-results/visual-uat";

if (!password) {
  throw new Error("UR_TEST_PASSWORD is required for visual UAT evidence.");
}

async function login(page: Page, email = "athlete@test.ur.local") {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
}

async function waitForPlayerHub(page: Page) {
  await expect(
    page.getByRole("heading", { name: "Seu ranking está vivo", exact: true }),
  ).toBeVisible({ timeout: 30_000 });
}

async function waitForJogar(page: Page) {
  await expect(
    page.getByRole("heading", { name: "Entre em quadra", exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    page.getByRole("heading", {
      name: "Oportunidades para jogar",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Quando você pode jogar?", exact: true }),
  ).toBeVisible();
}

async function waitForRanking(page: Page) {
  await expect(
    page.getByRole("heading", { name: "Ranking", exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    page.getByRole("navigation", { name: "Tipos de ranking" }),
  ).toBeVisible();
}

async function waitForResults(page: Page) {
  await expect(
    page.getByRole("heading", { name: "Resultados", exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: "Jogos atuais", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Sua trajetória antes do app",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Data não registrada na fonte histórica"),
  ).toBeVisible();
}

async function waitForSeason(page: Page) {
  await expect(
    page.getByRole("heading", { name: "Sua temporada, do começo ao fim" }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    page.getByRole("heading", {
      name: "O que é, quem entra e o que está em disputa",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Campeão R$ 1.200 · Vice R$ 800 · 3º R$ 500 · MVP R$ 700."),
  ).toBeVisible();
  await expect(
    page.getByText(/Nenhum percentual de classificação é estimado/).first(),
  ).toBeVisible();
}

async function waitForDevelopment(page: Page) {
  await expect(
    page.getByRole("heading", { name: "Como seu jogo está avançando" }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: "Seu momento em números" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Série histórica ainda não publicada" }),
  ).toBeVisible();
  await expect(
    page.getByText(/Hunter permanece uma área separada e opcional/),
  ).toBeVisible();
}

async function waitForHunter(page: Page) {
  await expect(
    page.getByRole("heading", {
      name: "Desenvolvimento para quem quer ir além do jogo.",
    }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    page.getByRole("heading", {
      name: "Adesão ainda não conectada ao Athlete App",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Quatro trilhas de desenvolvimento" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Quatro estados, sem progresso inventado",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(
      /seu status não é presumido e nenhuma solicitação de interesse é criada automaticamente/,
    ),
  ).toBeVisible();
}

async function waitForProfile(page: Page) {
  await expect(
    page.getByRole("heading", { name: "Meu Perfil", exact: true }),
  ).toBeVisible({ timeout: 30_000 });
}

async function capture(page: Page, name: string) {
  await mkdir(evidenceDir, { recursive: true });
  await page.screenshot({
    path: `${evidenceDir}/${name}.png`,
    fullPage: true,
  });
}

async function openAndCapture(
  page: Page,
  path: string,
  name: string,
  ready?: (page: Page) => Promise<void>,
) {
  await page.goto(path);
  await expect(page).toHaveURL(new RegExp(path.replaceAll("/", "\\/")));
  if (ready) await ready(page);
  await capture(page, name);
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth);
}

async function openMobileAndCapture(
  page: Page,
  path: string,
  name: string,
  ready?: (page: Page) => Promise<void>,
) {
  await page.goto(path);
  await expect(page).toHaveURL(new RegExp(path.replaceAll("/", "\\/")));
  if (ready) await ready(page);
  await expectNoHorizontalOverflow(page);
  await capture(page, name);
}

async function openAthletePreview(page: Page) {
  await login(page, "admin@test.ur.local");
  await page.goto("/admin/preview");
  await expect(
    page.getByRole("heading", { name: "Validar o App como atleta" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Abrir prévia" }).first().click();
  await expect(page).toHaveURL(/\/athlete/, { timeout: 30_000 });
  await expect(
    page.getByText("Prévia do Atleta · somente leitura"),
  ).toBeVisible();
  await waitForPlayerHub(page);
}

test("desktop athlete App visual evidence", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "desktop evidence only");
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);

  await expect(
    page.getByRole("navigation", { name: "Navegação do atleta" }),
  ).toBeVisible();
  await waitForPlayerHub(page);
  await capture(page, "desktop-1440x900-player-hub");

  await openAndCapture(
    page,
    "/athlete/agenda",
    "desktop-1440x900-jogar",
    waitForJogar,
  );
  await openAndCapture(
    page,
    "/athlete/ranking",
    "desktop-1440x900-ranking",
    waitForRanking,
  );
  await openAndCapture(
    page,
    "/athlete/results",
    "desktop-1440x900-results",
    waitForResults,
  );
  await openAndCapture(
    page,
    "/athlete/season",
    "desktop-1440x900-season",
    waitForSeason,
  );
  await openAndCapture(
    page,
    "/athlete/development",
    "desktop-1440x900-development",
    waitForDevelopment,
  );
  await openAndCapture(
    page,
    "/athlete/hunter",
    "desktop-1440x900-hunter",
    waitForHunter,
  );
  await openAndCapture(
    page,
    "/athlete/perfil",
    "desktop-1440x900-profile",
    waitForProfile,
  );
});

test("mobile 390 athlete shell visual evidence", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile evidence only");
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);

  await expect(
    page.getByRole("navigation", { name: "Navegação principal do atleta" }),
  ).toBeVisible();
  for (const destination of [
    "Início",
    "Jogar",
    "Ranking",
    "Hunter",
    "Perfil",
  ]) {
    await expect(
      page
        .getByRole("navigation", { name: "Navegação principal do atleta" })
        .getByText(destination, { exact: true }),
    ).toBeVisible();
  }
  await waitForPlayerHub(page);
  await expectNoHorizontalOverflow(page);
  await capture(page, "mobile-390x844-player-hub");

  await openMobileAndCapture(
    page,
    "/athlete/agenda",
    "mobile-390x844-jogar",
    waitForJogar,
  );
  await openMobileAndCapture(
    page,
    "/athlete/ranking",
    "mobile-390x844-ranking",
    waitForRanking,
  );
  await openMobileAndCapture(
    page,
    "/athlete/results",
    "mobile-390x844-results",
    waitForResults,
  );
  await openMobileAndCapture(
    page,
    "/athlete/season",
    "mobile-390x844-season",
    waitForSeason,
  );
  await openMobileAndCapture(
    page,
    "/athlete/development",
    "mobile-390x844-development",
    waitForDevelopment,
  );
  await openMobileAndCapture(
    page,
    "/athlete/hunter",
    "mobile-390x844-hunter",
    waitForHunter,
  );
  await openMobileAndCapture(
    page,
    "/athlete/perfil",
    "mobile-390x844-profile",
    waitForProfile,
  );
});

test("mobile compact 360 athlete shell visual evidence", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile evidence only");
  await page.setViewportSize({ width: 360, height: 800 });
  await login(page);
  await waitForPlayerHub(page);
  await expectNoHorizontalOverflow(page);
  await capture(page, "mobile-360x800-player-hub");

  await openMobileAndCapture(
    page,
    "/athlete/agenda",
    "mobile-360x800-jogar",
    waitForJogar,
  );
  await openMobileAndCapture(
    page,
    "/athlete/ranking",
    "mobile-360x800-ranking",
    waitForRanking,
  );
  await openMobileAndCapture(
    page,
    "/athlete/results",
    "mobile-360x800-results",
    waitForResults,
  );
  await openMobileAndCapture(
    page,
    "/athlete/season",
    "mobile-360x800-season",
    waitForSeason,
  );
  await openMobileAndCapture(
    page,
    "/athlete/development",
    "mobile-360x800-development",
    waitForDevelopment,
  );
  await openMobileAndCapture(
    page,
    "/athlete/hunter",
    "mobile-360x800-hunter",
    waitForHunter,
  );
});

test("admin Preview remains read-only on desktop", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "desktop evidence only");
  await page.setViewportSize({ width: 1440, height: 900 });
  await openAthletePreview(page);
  await capture(page, "preview-desktop-1440x900-player-hub");

  await openAndCapture(
    page,
    "/athlete/agenda",
    "preview-desktop-1440x900-jogar",
    waitForJogar,
  );
  await expect(
    page.getByText(/Prévia somente leitura\. Interesse, reserva, cancelamento/),
  ).toBeVisible();
  await openAndCapture(
    page,
    "/athlete/ranking",
    "preview-desktop-1440x900-ranking",
    waitForRanking,
  );
  await openAndCapture(
    page,
    "/athlete/results",
    "preview-desktop-1440x900-results",
    waitForResults,
  );
  await openAndCapture(
    page,
    "/athlete/season",
    "preview-desktop-1440x900-season",
    waitForSeason,
  );
  await openAndCapture(
    page,
    "/athlete/development",
    "preview-desktop-1440x900-development",
    waitForDevelopment,
  );
  await openAndCapture(
    page,
    "/athlete/hunter",
    "preview-desktop-1440x900-hunter",
    waitForHunter,
  );
});

test("admin Preview remains read-only on mobile", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile evidence only");
  await page.setViewportSize({ width: 390, height: 844 });
  await openAthletePreview(page);
  await expectNoHorizontalOverflow(page);
  await capture(page, "preview-mobile-390x844-player-hub");

  await openMobileAndCapture(
    page,
    "/athlete/agenda",
    "preview-mobile-390x844-jogar",
    waitForJogar,
  );
  await expect(
    page.getByText(/Prévia somente leitura\. Interesse, reserva, cancelamento/),
  ).toBeVisible();
  await openMobileAndCapture(
    page,
    "/athlete/ranking",
    "preview-mobile-390x844-ranking",
    waitForRanking,
  );
  await openMobileAndCapture(
    page,
    "/athlete/results",
    "preview-mobile-390x844-results",
    waitForResults,
  );
  await openMobileAndCapture(
    page,
    "/athlete/season",
    "preview-mobile-390x844-season",
    waitForSeason,
  );
  await openMobileAndCapture(
    page,
    "/athlete/development",
    "preview-mobile-390x844-development",
    waitForDevelopment,
  );
  await openMobileAndCapture(
    page,
    "/athlete/hunter",
    "preview-mobile-390x844-hunter",
    waitForHunter,
  );
});

test("Command executive management remains usable on mobile", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile evidence only");

  const viewports = [
    { width: 375, height: 667 },
    { width: 390, height: 844 },
    { width: 412, height: 915 },
  ] as const;

  await page.setViewportSize(viewports[1]);
  await login(page, "admin@test.ur.local");

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/admin/gestao");

    await expect(
      page.getByRole("heading", { name: "Gestão Executiva", exact: true }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("main")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Abrir navegação" }),
    ).toBeVisible();
    await expect(
      page.getByText("Resultados esperados", { exact: true }),
    ).toHaveCount(18);
    await expect(
      page.getByText("Indicadores de desempenho", { exact: true }),
    ).toHaveCount(18);
    await expect(page.getByText("Ritual semanal", { exact: true })).toHaveCount(
      18,
    );
    await expect(page.locator('select[name="profileId"]')).toHaveCount(18);

    const athleteExecutiveOptions = await page
      .locator('select[name="profileId"] option')
      .evaluateAll(
        (options) =>
          options.filter((option) => /athlete/i.test(option.textContent ?? ""))
            .length,
      );
    expect(athleteExecutiveOptions).toBe(0);

    await page
      .getByText("Direção e Estratégia", { exact: true })
      .first()
      .click();
    await expect(
      page.getByText("Resultados esperados", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("Crítica", { exact: true }).first(),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await capture(
      page,
      `command-executive-mobile-${viewport.width}x${viewport.height}`,
    );
  }

  const menu = page.getByRole("button", { name: "Abrir navegação" });
  await menu.click();
  await expect(
    page.getByRole("dialog", { name: "Menu de navegação" }),
  ).toBeVisible();
  await capture(page, "command-executive-mobile-412x915-navigation");
});
