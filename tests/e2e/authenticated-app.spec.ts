import { expect, test, type Page } from "@playwright/test";

const password = process.env.UR_TEST_PASSWORD ?? "";
if (!password) {
  throw new Error("UR_TEST_PASSWORD is required for authenticated E2E tests.");
}

async function login(page: Page, email: string, expectedPath: RegExp) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(expectedPath, { timeout: 30_000 });
}

test("athlete opens preserved Player Hub and core destinations", async ({
  page,
}) => {
  await login(page, "athlete@test.ur.local", /\/athlete/);

  await expect(page.getByText(/Ultimate Rivals · Player Hub/i)).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Navegação do atleta" }),
  ).toBeVisible();

  for (const destination of [
    { path: "/athlete/agenda", heading: "Agenda" },
    { path: "/athlete/ranking", heading: "Meu ranking" },
    { path: "/athlete/season", heading: "Sua campanha UR" },
    { path: "/athlete/perfil", heading: "Meu Perfil" },
  ]) {
    await page.goto(destination.path);
    await expect(
      page.getByRole("heading", { name: destination.heading }),
    ).toBeVisible({ timeout: 20_000 });
  }
});

test("athlete interest is reflected back into Command demand", async ({
  page,
}) => {
  await login(page, "athlete@test.ur.local", /\/athlete/);
  await page.goto("/athlete/agenda");

  const opportunity = page
    .getByText("[QA] Interesse - Duplas", { exact: true })
    .locator("xpath=ancestor::*[.//button[normalize-space()='Registrar interesse']][1]");

  await opportunity.getByRole("button", { name: "Registrar interesse" }).click();
  await expect(page.getByText("interessado", { exact: true })).toBeVisible({
    timeout: 20_000,
  });

  await login(page, "admin@test.ur.local", /\/admin/);
  await page.goto("/admin/agenda");

  const demand = page.getByTestId(
    "demand-61000000-0000-4000-8000-000000000001",
  );
  await expect(demand).toContainText("[QA] Interesse - Duplas");
  await expect(demand).toContainText("2");
  await expect(demand).toContainText("Interesse");
});

test("admin Preview renders athlete App read-only without replacing admin Auth", async ({
  page,
}) => {
  await login(page, "admin@test.ur.local", /\/admin/);

  await page.goto("/admin/preview");
  await expect(
    page.getByRole("heading", { name: "Validar o App como atleta" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Abrir prévia" }).first().click();

  await expect(page).toHaveURL(/\/athlete/, { timeout: 20_000 });
  await expect(
    page.getByText(/Prévia do Atleta · somente leitura/i),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Voltar ao Command" }),
  ).toBeVisible();

  await page.goto("/athlete/agenda");
  await expect(page.getByText(/Prévia somente leitura/i)).toBeVisible();

  await page.getByRole("button", { name: "Voltar ao Command" }).click();
  await expect(page).toHaveURL(/\/admin\/preview/, { timeout: 20_000 });
  await expect(
    page.getByRole("heading", { name: "Validar o App como atleta" }),
  ).toBeVisible();
});
