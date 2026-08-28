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
    page.getByRole("main").getByText("Rumo ao estrelato", { exact: true }),
  ).toBeVisible({ timeout: 30_000 });
}

async function waitForJogar(page: Page) {
  await expect(
    page.getByRole("heading", { name: "Entre em quadra", exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: "Oportunidades para jogar", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Quando você pode jogar?", exact: true }),
  ).toBeVisible();
}

async function waitForHunter(page: Page) {
  await expect(
    page.getByRole("heading", {
      name: "Desenvolvimento para quem quer ir além do jogo.",
    }),
  ).toBeVisible({ timeout: 30_000 });
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
});
