import { expect, test, type Page } from "@playwright/test";

const password = process.env.UR_TEST_PASSWORD ?? "";
if (!password)
  throw new Error("UR_TEST_PASSWORD is required for athlete E2E tests.");

async function login(page: Page) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.context().clearCookies();
      await page.goto("/login");
      await page.getByLabel("E-mail").fill("athlete@test.ur.local");
      await page.getByLabel("Senha").fill(password);
      await page.getByRole("button", { name: "Entrar" }).click();
      await expect(page).toHaveURL(/\/athlete/, { timeout: 30_000 });
      return;
    } catch (error) {
      lastError = error;
      if (attempt === 2) throw error;
      await page.waitForTimeout(1_500);
    }
  }
  throw lastError;
}

test("athlete season hub opens without private PII", async ({
  page,
}, testInfo) => {
  await login(page);
  await page.goto("/athlete");
  await expect(page.getByText(/season hub/i)).toBeVisible();
  await expect(page.getByText(/seu próximo passo/i)).toBeVisible();
  await expect(page.getByText(/ranking como competição viva/i)).toBeVisible();
  await expect(page.locator("body")).not.toContainText(
    /@test\.ur\.local|Telefone|Data de nascimento|service_role|storage_path|signed_url/i,
  );
  await page.screenshot({
    path: testInfo.outputPath(`athlete-home-${testInfo.project.name}.png`),
    fullPage: true,
  });
});

test("mobile athlete navigation covers five primary destinations", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile navigation scenario");
  test.setTimeout(90_000);
  await login(page);
  const nav = page.getByRole("navigation", {
    name: "Navegação principal do atleta",
  });
  await expect(nav).toBeVisible();
  const expected = ["Início", "Agenda", "Ranking", "Temporada", "Perfil"];
  await expect(nav.getByRole("link")).toHaveCount(expected.length);
  for (const item of expected) {
    await nav.getByRole("link", { name: item }).click();
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 20_000 });
  }
  await page.screenshot({
    path: testInfo.outputPath("mobile-primary-navigation.png"),
    fullPage: true,
  });
});

test("compact 360px shell keeps touch-friendly destinations", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Compact mobile scenario");
  await page.setViewportSize({ width: 360, height: 800 });
  await login(page);
  const links = page
    .getByRole("navigation", { name: "Navegação principal do atleta" })
    .getByRole("link");
  await expect(links).toHaveCount(5);
  for (let index = 0; index < 5; index++) {
    const box = await links.nth(index).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test("desktop athlete shell exposes season centers", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium",
    "Desktop navigation scenario",
  );
  await login(page);
  const nav = page.getByRole("navigation", { name: "Navegação do atleta" });
  await expect(nav).toBeVisible();

  await nav.getByRole("link", { name: "Agenda", exact: true }).click();
  await expect(page).toHaveURL(/\/athlete\/agenda/, { timeout: 20_000 });
  await expect(
    page.getByRole("heading", { name: /Minha agenda e calendário/i }),
  ).toBeVisible({ timeout: 20_000 });
  await page.screenshot({
    path: testInfo.outputPath("agenda-desktop.png"),
    fullPage: true,
  });

  await nav.getByRole("link", { name: "Ranking", exact: true }).click();
  await expect(page).toHaveURL(/\/athlete\/ranking/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Meu ranking" })).toBeVisible({
    timeout: 20_000,
  });
  await page.screenshot({
    path: testInfo.outputPath("ranking-desktop.png"),
    fullPage: true,
  });

  await nav.getByRole("link", { name: "Temporada", exact: true }).click();
  await expect(page).toHaveURL(/\/athlete\/season/, { timeout: 20_000 });
  await expect(
    page.getByRole("heading", { name: /Da primeira reserva/i }),
  ).toBeVisible({ timeout: 20_000 });
  await page.screenshot({
    path: testInfo.outputPath("season-desktop.png"),
    fullPage: true,
  });

  await nav.getByRole("link", { name: "Perfil", exact: true }).click();
  await expect(page).toHaveURL(/\/athlete\/profile/, { timeout: 20_000 });
  await page.screenshot({
    path: testInfo.outputPath("profile-desktop.png"),
    fullPage: true,
  });
});
