import { expect, test } from "@playwright/test";

const password = process.env.UR_TEST_PASSWORD ?? "";
if (!password) throw new Error("UR_TEST_PASSWORD is required for isolated QA.");

const viewports = [
  { width: 320, height: 640 },
  { width: 360, height: 800 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 430, height: 932 },
];
const routes = [
  "/athlete",
  "/athlete/agenda",
  "/athlete/disponibilidade",
  "/athlete/results",
  "/athlete/ranking",
  "/athlete/season",
  "/athlete/development",
  "/athlete/hunter",
  "/athlete/team",
  "/athlete/wallet",
  "/athlete/market",
  "/athlete/arenas",
  "/athlete/highlights",
  "/athlete/perfil",
  "/athlete/feedback",
];

test("player routes remain navigable and contained across compact and large phones", async ({
  page,
}) => {
  test.setTimeout(600_000);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("athlete@test.ur.local");
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/athlete/, { timeout: 30_000 });

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const route of routes) {
      await test.step(`${viewport.width}px ${route}`, async () => {
        const response = await page.goto(route);
        expect(response?.status()).toBeLessThan(400);
        await expect(page.locator("main")).toBeVisible();
        await expect(
          page.getByRole("navigation", {
            name: "Navegação principal do atleta",
          }),
        ).toBeVisible();
        await expect
          .poll(() =>
            page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
          )
          .toBe(true);
      });
    }
    await page.goto("/athlete/results");
    await expect(
      page.getByText("Data não registrada na fonte histórica"),
    ).toBeVisible();
  }
});
