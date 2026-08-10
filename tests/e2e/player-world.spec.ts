import { expect, test, type Page } from "@playwright/test";

const password = process.env.UR_TEST_PASSWORD ?? "";
if (!password)
  throw new Error("UR_TEST_PASSWORD is required for athlete E2E tests.");

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("athlete@test.ur.local");
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/athlete/, { timeout: 30_000 });
}

test("player hub exposes the persistent sports world", async ({ page }, testInfo) => {
  await login(page);
  await page.goto("/athlete");

  for (const text of [
    /Player Hub/i,
    /Objetivo atual/i,
    /Mapa da campanha/i,
    /Ranking como competição viva/i,
    /Próxima arena/i,
    /Áreas de progressão/i,
  ]) {
    await expect(page.getByText(text).first()).toBeVisible({ timeout: 20_000 });
  }

  await expect(page.locator("body")).not.toContainText(
    /service_role|storage_path|signed_url|Data de nascimento|Telefone/i,
  );
  await page.screenshot({
    path: testInfo.outputPath(`player-world-${testInfo.project.name}.png`),
    fullPage: true,
  });
});

test("athlete ecosystem destinations open without private operational data", async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);
  await login(page);

  const destinations = [
    { path: "/athlete/arenas", heading: /Onde a temporada acontece/i },
    { path: "/athlete/development", heading: /Missões e evolução/i },
    { path: "/athlete/highlights", heading: /Sua história dentro do UR/i },
    { path: "/athlete/market", heading: /Transforme participação em utilidade/i },
  ];

  for (const destination of destinations) {
    await page.goto(destination.path);
    await expect(
      page.getByRole("heading", { name: destination.heading }).first(),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("body")).not.toContainText(
      /service_role|storage_path|signed_url|verified_revenue|verified_margin/i,
    );
  }

  await page.screenshot({
    path: testInfo.outputPath(`player-ecosystem-${testInfo.project.name}.png`),
    fullPage: true,
  });
});

test("market keeps ranking points and UR Coins conceptually separated", async ({ page }) => {
  await login(page);
  await page.goto("/athlete/market");
  await expect(page.getByText(/Seu saldo/i).first()).toBeVisible();
  await expect(page.getByText(/URC/i).first()).toBeVisible();
  await expect(page.getByText(/Pontos de ranking e UR Coins continuam economias separadas/i)).toBeVisible();
});

test("highlights never exposes unpublished status labels", async ({ page }) => {
  await login(page);
  await page.goto("/athlete/highlights");
  await expect(page.locator("body")).not.toContainText(/\bprivate\b|\bdraft\b|\binternal\b/i);
});
