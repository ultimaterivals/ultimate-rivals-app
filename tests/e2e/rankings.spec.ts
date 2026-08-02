import { expect, test, type Page } from "@playwright/test";

const password = process.env.UR_TEST_PASSWORD ?? "";
if (!password)
  throw new Error("UR_TEST_PASSWORD is required for ranking E2E tests.");

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).not.toHaveURL(/\/login$/, { timeout: 20_000 });
}

test("public rankings expose sports data without PII", async ({ page }) => {
  await page.goto("/rankings");
  await expect(
    page.getByRole("heading", { name: "Rankings oficiais" }),
  ).toBeVisible();
  for (const route of ["individual", "teams", "poles", "doubles", "fours"]) {
    await page.goto(`/rankings/${route}`);
    await expect(page.getByText("Classificação pública")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(
      /@test\.ur\.local|Telefone|Nascimento completo|Notas administrativas/i,
    );
  }
  await page.goto("/rankings/individual");
  const athlete = page.locator('a[href^="/athletes/"]').first();
  if (await athlete.count()) {
    await athlete.click();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
    await expect(page.locator("body")).not.toContainText(
      /@test\.ur\.local|\+55\s?\d|\d{2}\/\d{2}\/\d{4}/i,
    );
  }
});

test("athlete sees position, movement, level, points and statistics", async ({
  page,
}) => {
  await login(page, "athlete@test.ur.local");
  await page.goto("/athlete/ranking");
  await expect(
    page.getByRole("heading", { name: "Meu ranking" }),
  ).toBeVisible();
  await expect(page.getByText(/N[123] ·|Em Nivelamento/).first()).toBeVisible();
  await expect(page.getByText("PONTOS NA TEMPORADA")).toBeVisible();
  await expect(page.getByText("Aproveitamento")).toBeVisible();
  await expect(page.getByText("HISTÓRICO DE POSIÇÕES")).toBeVisible();
});

test("team manager sees team position and athlete contributions", async ({
  page,
}) => {
  await login(page, "teammanager@test.ur.local");
  await page.goto("/team/ranking");
  await expect(page.getByText("Disputa por equipes")).toBeVisible();
  await expect(page.getByText("PTS NO TRIMESTRE")).toBeVisible();
  await expect(page.getByText("CONTRIBUIÇÃO DOS ATLETAS")).toBeVisible();
});

test("admin switches rankings, filters and captures a snapshot", async ({
  page,
}) => {
  await login(page, "admin@test.ur.local");
  await page.goto("/admin/rankings");
  await expect(page.getByRole("heading", { name: "Rankings" })).toBeVisible();
  const rankingTabs = page.getByRole("navigation", {
    name: "Tipos de ranking",
  });
  await rankingTabs.getByRole("link", { name: "Equipes" }).click();
  await expect(page).toHaveURL(/type=team/);
  await rankingTabs.getByRole("link", { name: "Individual" }).click();
  await page.getByLabel("Nível").selectOption("n2");
  await page.getByRole("button", { name: "Filtrar" }).click();
  await expect(page).toHaveURL(/level=n2/);
  await page.getByRole("button", { name: "Capturar snapshot" }).click();
  await expect(page.getByRole("heading", { name: "Rankings" })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole("link", { name: "Exportar CSV" })).toBeVisible();
});
