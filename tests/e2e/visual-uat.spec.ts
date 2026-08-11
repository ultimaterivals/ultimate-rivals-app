import { mkdir } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

const password = process.env.UR_TEST_PASSWORD ?? "";
const evidenceDir = "test-results/visual-uat";

if (!password) {
  throw new Error("UR_TEST_PASSWORD is required for visual UAT evidence.");
}

async function login(page: Page) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("athlete@test.ur.local");
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/athlete/, { timeout: 30_000 });
}

async function capture(page: Page, name: string) {
  await mkdir(evidenceDir, { recursive: true });
  await page.screenshot({
    path: `${evidenceDir}/${name}.png`,
    fullPage: true,
  });
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth);
}

test("desktop athlete App visual evidence", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "desktop evidence only");
  await login(page);

  await expect(
    page.getByRole("navigation", { name: "Navegação do atleta" }),
  ).toBeVisible();
  await capture(page, "desktop-player-hub");

  await page.goto("/athlete/development");
  await expect(
    page.getByRole("heading", { name: "Sua progressão" }),
  ).toBeVisible();
  await capture(page, "desktop-development");

  await page.goto("/athlete/market");
  await expect(page).toHaveURL(/\/athlete\/market/);
  await capture(page, "desktop-market");
});

test("mobile athlete App visual evidence", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile evidence only");
  await login(page);

  await expect(
    page.getByRole("navigation", { name: "Navegação principal do atleta" }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await capture(page, "mobile-player-hub");

  await page.goto("/athlete/perfil");
  await expect(page.getByRole("heading", { name: /perfil/i })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await capture(page, "mobile-profile");
});
