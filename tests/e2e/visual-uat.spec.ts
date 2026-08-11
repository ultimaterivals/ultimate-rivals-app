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

async function openAndCapture(page: Page, path: string, name: string) {
  await page.goto(path);
  await expect(page).toHaveURL(new RegExp(path.replaceAll("/", "\\/")));
  await capture(page, name);
}

// Regression gate: mobile athlete surfaces must never widen the viewport.
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

test("desktop athlete App visual evidence", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "desktop evidence only");
  await login(page);

  await expect(
    page.getByRole("navigation", { name: "Navegação do atleta" }),
  ).toBeVisible();
  await capture(page, "desktop-player-hub");

  await openAndCapture(page, "/athlete/agenda", "desktop-agenda");
  await openAndCapture(page, "/athlete/ranking", "desktop-ranking");
  await openAndCapture(page, "/athlete/development", "desktop-development");
  await openAndCapture(page, "/athlete/wallet", "desktop-wallet");
  await openAndCapture(page, "/athlete/market", "desktop-market");
  await openAndCapture(page, "/athlete/arenas", "desktop-arenas");
  await openAndCapture(page, "/athlete/highlights", "desktop-highlights");
  await openAndCapture(page, "/athlete/feedback", "desktop-feedback");
});

test("mobile athlete App visual evidence", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile evidence only");
  await login(page);

  await expect(
    page.getByRole("navigation", { name: "Navegação principal do atleta" }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await capture(page, "mobile-player-hub");

  await openMobileAndCapture(page, "/athlete/agenda", "mobile-agenda");
  await openMobileAndCapture(page, "/athlete/ranking", "mobile-ranking");
  await openMobileAndCapture(
    page,
    "/athlete/development",
    "mobile-development",
  );
  await openMobileAndCapture(page, "/athlete/wallet", "mobile-wallet");
  await openMobileAndCapture(page, "/athlete/market", "mobile-market");
  await openMobileAndCapture(page, "/athlete/arenas", "mobile-arenas");
  await openMobileAndCapture(page, "/athlete/highlights", "mobile-highlights");
  await openMobileAndCapture(page, "/athlete/perfil", "mobile-profile");
  await openMobileAndCapture(page, "/athlete/feedback", "mobile-feedback");
});
