import { expect, test } from "@playwright/test";

const password = process.env.UR_TEST_PASSWORD ?? "";
if (!password) throw new Error("UR_TEST_PASSWORD is required for isolated QA.");

test("an invited returning player claims her own validated game on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("admin@test.ur.local");
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin/, { timeout: 30_000 });

  await page.goto("/admin/atletas/acessos?q=%5BQA%5D%20Athlete%20C");
  const row = page.getByRole("row").filter({ hasText: "[QA] Athlete C" });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Gerar primeiro acesso" }).click();
  const oneTimeLink = row.locator("code");
  await expect(oneTimeLink).toContainText(/\/claim\?token=[a-f0-9]{64}/);
  const path = (await oneTimeLink.textContent())?.trim() ?? "";

  await page.context().clearCookies();
  await page.goto(path);
  await expect(
    page.getByRole("heading", { name: "Primeiro acesso" }),
  ).toBeVisible();
  await page.getByLabel("Como quer ser chamado").fill("[QA] Athlete C");
  await page.getByLabel("E-mail").fill("historical-c@test.ur.local");
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Criar conta e continuar" }).click();
  await expect(
    page.getByRole("button", { name: "Concluir primeiro acesso" }),
  ).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Concluir primeiro acesso" }).click();
  await expect(page).toHaveURL(/\/athlete$/, { timeout: 30_000 });
  await expect(page.getByText("[QA] Athlete C").first()).toBeVisible();

  await page.goto("/athlete/results");
  await expect(
    page.getByRole("heading", { name: "Sua trajetória antes do app" }),
  ).toBeVisible();
  await expect(
    page.getByText("[QA] Athlete A / Athlete C × [QA] Athlete B / Guest"),
  ).toBeVisible();
  await expect(
    page.getByText("Data não registrada na fonte histórica"),
  ).toBeVisible();
  await expect(page.getByText("11 × 8")).toBeVisible();
  await expect(
    page.getByText("Prévia do Atleta · somente leitura"),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});
