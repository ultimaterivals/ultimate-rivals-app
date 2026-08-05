import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { createSquadE2EFixture } from "./squad-fixture";

const password = process.env.UR_TEST_PASSWORD ?? "";
if (!password)
  throw new Error("UR_TEST_PASSWORD is required for authenticated E2E tests.");

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).not.toHaveURL(/\/login$/, { timeout: 20_000 });
}

test("admin signs in and creates a development pole", async ({
  page,
}, testInfo) => {
  await login(page, "admin@test.ur.local");
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/poles");
  const suffix = `${testInfo.project.name}-${Date.now()}`.toLowerCase();
  await page.getByLabel("Nome").fill(`[TEST] Playwright ${suffix}`);
  await page.getByLabel("Slug").fill(`playwright-${suffix}`);
  await page.getByLabel("Cidade").fill("Betim");
  await page.getByLabel("UF").fill("MG");
  await page.getByRole("button", { name: "Criar" }).click({ force: true });
  await expect(page.getByText("Polo criado.")).toBeVisible();
  await expect(page.getByText(`[TEST] Playwright ${suffix}`)).toBeVisible();
});

test("athlete signs in, sees own profile and cannot access admin", async ({
  page,
}) => {
  await login(page, "athlete@test.ur.local");
  await expect(page).toHaveURL(/\/athlete$/);
  await page.goto("/athlete/profile");
  await expect(
    page.getByRole("heading", { name: "Test Athlete 01" }),
  ).toBeVisible();
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/athlete$/);
});

test("team manager cannot access global admin", async ({ page }) => {
  await login(page, "teammanager@test.ur.local");
  await expect(page).toHaveURL(/\/team$/);
  await expect(page.getByText("Clube oficial")).toBeVisible();
  await page.goto("/team/formations");
  await expect(page.getByRole("heading", { name: /^Forma/ })).toBeVisible();
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/team$/);
});

test("admin creates a fictitious sports team", async ({ page }, testInfo) => {
  await login(page, "admin@test.ur.local");
  await page.goto("/admin/teams/new");
  const suffix = `${testInfo.project.name}-${Date.now()}`.toLowerCase();
  await page
    .getByPlaceholder("Nome", { exact: true })
    .fill(`[TEST] Team ${suffix}`);
  await page.getByPlaceholder("slug-da-equipe").fill(`test-team-${suffix}`);
  await page.getByRole("combobox").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Criar equipe" }).click();
  await expect(page).toHaveURL(/\/admin\/teams\/[a-f0-9-]+$/, {
    timeout: 20_000,
  });
  await expect(
    page.getByRole("heading", { name: `[TEST] Team ${suffix}` }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: /de polo$/ })).toBeVisible();
});

test("athlete sees team context but no edit controls", async ({ page }) => {
  await login(page, "athlete@test.ur.local");
  await page.goto("/athlete/profile");
  await expect(
    page.getByRole("heading", { name: "Minha equipe" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /^Forma.*atuais$/ }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Criar/i })).toHaveCount(0);
});

test("admin completes Athlete 360 lifecycle", async ({ page }, testInfo) => {
  await login(page, "admin@test.ur.local");
  await page.goto("/admin/athletes");
  await page.getByLabel("Buscar atletas").fill("UR-");
  await page.getByRole("button", { name: "Filtrar" }).click();
  await expect(page.getByText(/cadastros encontrados/)).toBeVisible();
  await page.getByRole("link", { name: "Novo atleta" }).click();
  const suffix = `${testInfo.project.name}-${Date.now()}`;
  await page.getByLabel("Nome completo").fill(`[TEST] Fictitious ${suffix}`);
  await page.getByLabel("Nome público").fill(`[TEST] ${suffix}`);
  await page.getByRole("button", { name: "Cadastrar atleta" }).click();
  await expect(page).toHaveURL(/\/admin\/athletes\/[a-f0-9-]+$/, {
    timeout: 20_000,
  });
  await expect(page.getByText(/^UR-\d{6}$/)).toBeVisible();
  await page.getByRole("button", { name: "Arquivar" }).click();
  await expect(page.getByRole("button", { name: "Reativar" })).toBeVisible();
  await page.getByRole("button", { name: "Reativar" }).click();
  await expect
    .poll(
      async () => {
        await page.reload();
        return page.getByRole("button", { name: "Arquivar" }).count();
      },
      { timeout: 20_000 },
    )
    .toBe(1);
});

test("athlete edits only permitted profile data", async ({ page }) => {
  await login(page, "athlete@test.ur.local");
  await page.goto("/athlete/profile");
  await page.getByRole("link", { name: "Editar meu perfil" }).click();
  await page.getByLabel("Bio esportiva").fill("[TEST] Bio esportiva E2E");
  await page.getByRole("button", { name: "Salvar perfil" }).click();
  await expect(page).toHaveURL(/\/athlete\/profile\?updated=1$/, {
    timeout: 20_000,
  });
  await expect(page.getByText("Perfil atualizado.")).toBeVisible();
  await page.goto("/admin/athletes");
  await expect(page).toHaveURL(/\/athlete$/);
});

test("admin operates season and progression dashboards", async ({ page }) => {
  await login(page, "admin@test.ur.local");
  await page.goto("/admin/seasons");
  await expect(
    page.getByRole("heading", { name: /^Temporadas$/ }),
  ).toBeVisible();
  await page.goto("/admin/seasons/10000000-0000-4000-8000-000000000001");
  await expect(
    page.getByRole("heading", { name: /Ciclos mensais/ }),
  ).toBeVisible();
  await page.goto("/admin/leveling");
  await expect(
    page.getByRole("heading", { name: /^Nivelamento$/ }),
  ).toBeVisible();
  await page.goto("/admin/assessments");
  await expect(page.getByRole("heading", { name: /^Avalia/ })).toBeVisible();
  await expect(page.getByText(/TECHNICAL/)).toBeVisible();
});

test("athlete sees development journey without homologation controls", async ({
  page,
}) => {
  await login(page, "athlete@test.ur.local");
  await page.goto("/athlete/development");
  await expect(
    page.getByRole("heading", { name: "Desenvolvimento" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Jornada" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Homologar/ })).toHaveCount(0);
});

test("admin opens UR Play session management", async ({ page }) => {
  await login(page, "admin@test.ur.local");
  await page.goto("/admin/ur-play");
  await expect(
    page.getByRole("heading", { name: "UR Play", exact: true }),
  ).toBeVisible();
  await page.goto("/admin/ur-play/new");
  await expect(
    page.getByRole("heading", { name: "Criar sessão" }),
  ).toBeVisible();
});

test("athlete opens UR Play registration portal", async ({ page }) => {
  await login(page, "athlete@test.ur.local");
  await page.goto("/athlete/ur-play");
  await expect(
    page.getByRole("heading", { name: "UR Play", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Próximas sessões/)).toBeVisible();
});

test("operator opens mobile Court Ops", async ({ page }) => {
  await login(page, "operator@test.ur.local");
  await page.goto("/ops/ur-play");
  await expect(
    page.getByRole("heading", { name: "Sessões de hoje" }),
  ).toBeVisible();
});

test("operator mounts, calls, starts and abandons a Court Ops match", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const sessionId = process.env.UR_TEST_COURT_OPS_SESSION_ID;
  if (!sessionId) throw new Error("UR_TEST_COURT_OPS_SESSION_ID is required.");
  await login(page, "operator@test.ur.local");
  await page.goto(`/ops/ur-play/${sessionId}/court-ops`);
  await expect(page.getByRole("heading", { name: "Court Ops" })).toBeVisible();
  await page.getByRole("link", { name: "MONTAR JOGO" }).first().click();
  await page.getByLabel("Categoria").selectOption({ label: "Misto" });
  await page.locator('select[name="level"]').selectOption("n2");
  const athleteSelects = page.getByLabel(/LADO [AB] · atleta/);
  const playerValue = async (number: number) =>
    athleteSelects
      .first()
      .locator("option")
      .filter({ hasText: `Player ${number}` })
      .getAttribute("value");
  await athleteSelects.nth(0).selectOption((await playerValue(5))!);
  await athleteSelects.nth(1).selectOption((await playerValue(6))!);
  await athleteSelects.nth(2).selectOption((await playerValue(7))!);
  await athleteSelects.nth(3).selectOption((await playerValue(8))!);
  await page.getByRole("button", { name: "CRIAR JOGO NA FILA" }).click();
  await expect(page).toHaveURL(/\/ops\/matches\/[a-f0-9-]+$/, {
    timeout: 20_000,
  });
  await page.getByRole("button", { name: "CHAMAR ATLETAS" }).click();
  await expect(
    page.getByRole("button", { name: "TODOS PRONTOS" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "TODOS PRONTOS" }).click();
  await expect(
    page.getByRole("button", { name: "INICIAR JOGO" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "INICIAR JOGO" }).click();
  await expect
    .poll(
      async () => {
        await page.reload();
        return page.getByTestId("point-a").count();
      },
      { timeout: 20_000 },
    )
    .toBe(1);
  await page.getByRole("button", { name: "ABANDONAR PARTIDA" }).click();
  await expect
    .poll(
      async () => {
        await page.reload();
        return page.getByText("ABANDONED", { exact: true }).count();
      },
      { timeout: 20_000 },
    )
    .toBe(1);
});

test("admin views Court Ops operation on desktop", async ({ page }) => {
  const sessionId = process.env.UR_TEST_COURT_OPS_SESSION_ID;
  if (!sessionId) throw new Error("UR_TEST_COURT_OPS_SESSION_ID is required.");
  await login(page, "admin@test.ur.local");
  await page.goto(`/ops/ur-play/${sessionId}/court-ops`);
  await expect(page.getByRole("heading", { name: "Court Ops" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "AGUARDANDO" })).toBeVisible();
});

test("operator reviews and confirms deterministic match suggestion", async ({
  page,
}) => {
  const sessionId = process.env.UR_TEST_COURT_OPS_SESSION_ID;
  if (!sessionId) throw new Error("UR_TEST_COURT_OPS_SESSION_ID is required.");
  await login(page, "operator@test.ur.local");
  await page.goto(`/ops/ur-play/${sessionId}/court-ops`);
  await page.locator('select[name="level"]').selectOption("n2");
  await page.getByRole("button", { name: "GERAR SUGESTÃO" }).click();
  await page.waitForURL(/suggest=1/, { timeout: 20_000 });
  await expect(page.getByText(/Sugestão baseada em/)).toBeVisible();
  await page.getByRole("button", { name: "CONFIRMAR SUGESTÃO" }).click();
  await expect(page).toHaveURL(/\/ops\/matches\/[a-f0-9-]+$/, {
    timeout: 20_000,
  });
  await expect(page.getByText("QUEUED", { exact: true })).toBeVisible();
  await page
    .getByPlaceholder("Motivo do cancelamento")
    .fill("[TEST] suggestion cleanup");
  await page.getByRole("button", { name: "CANCELAR" }).click();
  await expect
    .poll(
      async () => {
        await page.reload();
        return page.getByText("CANCELLED", { exact: true }).count();
      },
      { timeout: 20_000 },
    )
    .toBe(1);
});

test("athlete reads session Court Ops state without edit controls", async ({
  page,
}) => {
  const sessionId = process.env.UR_TEST_COURT_OPS_SESSION_ID;
  if (!sessionId) throw new Error("UR_TEST_COURT_OPS_SESSION_ID is required.");
  await login(page, "athlete@test.ur.local");
  await page.goto(`/athlete/ur-play/${sessionId}`);
  await expect(page.getByRole("heading", { name: /Court Ops/ })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /INICIAR JOGO|CHAMAR ATLETAS/ }),
  ).toHaveCount(0);
});

test("operator completes fours, reserves, lineup and court workflow", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const fixture = await createSquadE2EFixture();
  const relogin = async (email: string) => {
    await page.context().clearCookies();
    await login(page, email);
  };
  const openBuilder = async (categoryId: string) => {
    await page.goto(
      `/ops/ur-play/${fixture.sessionId}/court-ops/new?court=${fixture.courts[0]}`,
    );
    await page.getByLabel("Formato").selectOption(fixture.foursId);
    await page.getByLabel("Categoria").selectOption(categoryId);
    await page.locator('select[name="level"]').selectOption(fixture.level);
  };

  await login(page, "operator@test.ur.local");
  await openBuilder(fixture.femaleId);
  const femaleIds = fixture.generated.filter((_, index) => index % 2 === 0);
  for (const [index, athleteId] of femaleIds.slice(0, 4).entries())
    await page
      .locator('select[name="sideA"]')
      .nth(index)
      .selectOption(athleteId);
  for (const [index, athleteId] of femaleIds.slice(4, 8).entries())
    await page
      .locator('select[name="sideB"]')
      .nth(index)
      .selectOption(athleteId);
  await page.getByRole("button", { name: "CRIAR JOGO NA FILA" }).click();
  await expect(page).toHaveURL(/\/ops\/matches\/[a-f0-9-]+$/, {
    timeout: 20_000,
  });
  await expect(page.getByText("Nenhuma reserva convocada.")).toHaveCount(2);
  await page
    .getByPlaceholder("Motivo do cancelamento")
    .fill("[TEST] female fours complete");
  await page.getByRole("button", { name: "CANCELAR" }).click();
  await expect(page.getByText("CANCELLED", { exact: true })).toBeVisible();

  await openBuilder(fixture.mixedId);
  const sideA = page.locator('select[name="sideA"]'),
    sideB = page.locator('select[name="sideB"]');
  for (const [index, athleteId] of [
    fixture.generated[0]!,
    fixture.generated[2]!,
    fixture.generated[4]!,
    fixture.generated[6]!,
  ].entries())
    await sideA.nth(index).selectOption(athleteId);
  for (const [index, athleteId] of [
    fixture.generated[1]!,
    fixture.generated[3]!,
    fixture.generated[5]!,
    fixture.generated[7]!,
  ].entries())
    await sideB.nth(index).selectOption(athleteId);
  await expect(
    page.getByText(/composição mixed inválida/).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "CRIAR JOGO NA FILA" }),
  ).toBeDisabled();

  for (const [index, athleteId] of fixture.generated.slice(0, 4).entries())
    await sideA.nth(index).selectOption(athleteId);
  for (const [index, athleteId] of fixture.generated.slice(4, 8).entries())
    await sideB.nth(index).selectOption(athleteId);
  await page
    .getByText(/BANCO · 0\/3 reservas/)
    .first()
    .click();
  for (let index = 0; index < 3; index++)
    await page
      .getByRole("button", { name: "ADICIONAR RESERVA" })
      .first()
      .click();
  await page
    .getByText(/BANCO · 0\/3 reservas/)
    .first()
    .click();
  for (let index = 0; index < 3; index++)
    await page
      .getByRole("button", { name: "ADICIONAR RESERVA" })
      .first()
      .click();
  const sideAReserves = page.locator('select[name="sideAReserves"]'),
    sideBReserves = page.locator('select[name="sideBReserves"]');
  for (const [index, athleteId] of [
    fixture.athleteId,
    fixture.generated[8],
    fixture.generated[9],
  ].entries())
    await sideAReserves.nth(index).selectOption(athleteId);
  for (const [index, athleteId] of fixture.generated.slice(10, 13).entries())
    await sideBReserves.nth(index).selectOption(athleteId);
  await page.getByRole("button", { name: "CRIAR JOGO NA FILA" }).click();
  await expect(page).toHaveURL(/\/ops\/matches\/[a-f0-9-]+$/, {
    timeout: 20_000,
  });
  const matchUrl = page.url();
  await expect(
    page.getByText(fixture.athleteName, { exact: false }).first(),
  ).toBeVisible();

  await relogin("athlete@test.ur.local");
  await page.goto(`/athlete/ur-play/${fixture.sessionId}`);
  await expect(page.getByText("VOCÊ FOI CONVOCADO")).toBeVisible();
  await expect(page.getByText(/^RESERVA/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "COLOCAR EM QUADRA" }),
  ).toHaveCount(0);

  await relogin("operator@test.ur.local");
  await page.goto(matchUrl);
  let reserveCard = page
    .getByText(fixture.athleteName, { exact: false })
    .first()
    .locator(
      "xpath=ancestor::div[contains(@class,'border-zinc-800') and contains(@class,'grid')][1]",
    );
  await reserveCard.locator('select[name="presence"]').selectOption("present");
  await reserveCard.getByRole("button", { name: "CONFIRMAR PRESENÇA" }).click();
  reserveCard = page
    .getByText(fixture.athleteName, { exact: false })
    .first()
    .locator(
      "xpath=ancestor::div[contains(@class,'border-zinc-800') and contains(@class,'grid')][1]",
    );
  await reserveCard
    .getByLabel("Titular que sai")
    .selectOption({ label: fixture.sameGenderStarterName });
  await reserveCard.getByRole("button", { name: "COLOCAR EM QUADRA" }).click();

  await relogin("athlete@test.ur.local");
  await page.goto(`/athlete/ur-play/${fixture.sessionId}`);
  await expect(page.getByText("VOCÊ ESTÁ ESCALADO")).toBeVisible();
  await expect(page.getByText("TITULAR", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "ALTERAR QUADRA" }),
  ).toHaveCount(0);

  await relogin("operator@test.ur.local");
  await page.goto(matchUrl);
  await page.getByLabel("Alterar quadra").selectOption(fixture.courts[2]!);
  await page.getByRole("button", { name: "ALTERAR QUADRA" }).click();
  await expect(page.getByText("[TEST] E2E Squad Court 3")).toBeVisible();
  for (const action of ["CHAMAR ATLETAS", "TODOS PRONTOS", "INICIAR JOGO"])
    await page.getByRole("button", { name: action }).click();
  await expect(page.getByTestId("point-a")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "COLOCAR EM QUADRA" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "ALTERAR QUADRA" }),
  ).toHaveCount(0);
});
