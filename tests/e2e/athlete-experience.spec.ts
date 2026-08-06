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

test("athlete opens the integrated home without private PII", async ({
  page,
}) => {
  await login(page);
  await page.goto("/athlete");
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.getByText(/Ranking N[123]/).first()).toBeVisible();
  await expect(page.getByText(/Performance recente/i)).toBeVisible();
  await expect(page.locator("body")).not.toContainText(
    /@test\.ur\.local|Telefone|Data de nascimento|service_role/i,
  );
});

test("mobile athlete navigation covers the primary journey", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile navigation scenario");
  test.setTimeout(90_000);
  await login(page);
  const nav = page.getByRole("navigation", {
    name: "NavegaÃ§Ã£o principal do atleta",
  });
  await expect(nav).toBeVisible();
  for (const item of [
    "Agenda",
    "UR Play",
    "Comp.",
    "Ranking",
    "Performance",
    "Perfil",
  ]) {
    await nav.getByRole("link", { name: item }).click();
    await expect(page.locator("h1").first()).toBeVisible({
      timeout: 20_000,
    });
  }
  await page.getByRole("link", { name: /Notifica/ }).click();
  await expect(page.getByRole("heading", { name: /Notifica/ })).toBeVisible();
  const read = page.getByRole("button", { name: "MARCAR COMO LIDA" }).first();
  if (await read.count()) await read.click();
  await expect(page.locator("body")).not.toContainText(/PGRST|Postgrest/i);
});

test("compact 360px shell keeps touch-friendly destinations", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Compact mobile scenario");
  await page.setViewportSize({ width: 360, height: 800 });
  await login(page);
  const links = page
    .getByRole("navigation", { name: "NavegaÃ§Ã£o principal do atleta" })
    .getByRole("link");
  await expect(links).toHaveCount(7);
  for (let index = 0; index < 7; index++) {
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

test("desktop athlete shell exposes career navigation and key centers", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium",
    "Desktop navigation scenario",
  );
  await login(page);
  const nav = page.getByRole("navigation", { name: "NavegaÃ§Ã£o do atleta" });
  await expect(nav).toBeVisible();
  await nav.getByRole("link", { name: "Performance" }).click();
  await expect(page).toHaveURL(/\/athlete\/performance/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Performance" })).toBeVisible({
    timeout: 20_000,
  });
  await nav.getByRole("link", { name: "Ranking", exact: true }).click();
  await expect(page).toHaveURL(/\/athlete\/ranking/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Meu ranking" })).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole("link", { name: /Notifica/ }).click();
  await expect(page.getByRole("heading", { name: /Notifica/ })).toBeVisible();
});
