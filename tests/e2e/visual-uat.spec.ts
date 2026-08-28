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

async function capture(page: Page, name: string) {
  await mkdir(evidenceDir, { recursive: true });
  await page.screenshot({
    path: `${evidenceDir}/${name}.png`,
    fullPage: true,
  });
}

async function openAndCapture(page: Page, path: string, name: string) {
  await page.goto(path);
  await expect(page).toHaveURL(new RegExp(path.replaceAll("/", "\\/")));
  await capture(page, name);
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth);
}

async function openMobileAndCapture(page: Page, path: string, name: string) {
  await page.goto(path);
  await expect(page).toHaveURL(new RegExp(path.replaceAll("/", "\\/")));
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
}

test("desktop athlete App visual evidence", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "desktop evidence only");
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);

  await expect(
    page.getByRole("navigation", { name: "Navegação do atleta" }),
  ).toBeVisible();
  await capture(page, "desktop-1440x900-player-hub");

  await openAndCapture(page, "/athlete/hunter", "desktop-1440x900-hunter");
  await openAndCapture(page, "/athlete/perfil", "desktop-1440x900-profile");
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
  await expectNoHorizontalOverflow(page);
  await capture(page, "mobile-390x844-player-hub");

  await openMobileAndCapture(page, "/athlete/hunter", "mobile-390x844-hunter");
  await openMobileAndCapture(page, "/athlete/perfil", "mobile-390x844-profile");
});

test("mobile compact 360 athlete shell visual evidence", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile evidence only");
  await page.setViewportSize({ width: 360, height: 800 });
  await login(page);
  await expectNoHorizontalOverflow(page);
  await capture(page, "mobile-360x800-player-hub");
});

test("admin Preview remains read-only on desktop", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "desktop evidence only");
  await page.setViewportSize({ width: 1440, height: 900 });
  await openAthletePreview(page);
  await capture(page, "preview-desktop-1440x900-player-hub");
});

test("admin Preview remains read-only on mobile", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile evidence only");
  await page.setViewportSize({ width: 390, height: 844 });
  await openAthletePreview(page);
  await expectNoHorizontalOverflow(page);
  await capture(page, "preview-mobile-390x844-player-hub");
});
