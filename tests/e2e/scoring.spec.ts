import { expect, test, type Page } from "@playwright/test";
import { createScoringE2EFixture } from "./scoring-fixture";

const password = process.env.UR_TEST_PASSWORD ?? "";
if (!password)
  throw new Error("UR_TEST_PASSWORD is required for scoring E2E tests.");

async function login(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).not.toHaveURL(/\/login$/, { timeout: 20_000 });
}

test.describe.serial("Sprint 8 scoring journey", () => {
  let fixture: Awaited<ReturnType<typeof createScoringE2EFixture>>;

  test.beforeAll(async ({}, testInfo) => {
    fixture = await createScoringE2EFixture(
      testInfo.project.name === "chromium",
    );
  });

  test("operator records and reviews scoring on mobile", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile");
    test.setTimeout(120_000);
    await login(page, "operator@test.ur.local");
    await page.goto(`/ops/matches/${fixture.matchId}`);
    await expect(page.getByTestId("score-a")).toHaveText("0");
    await page.getByTestId("point-a").click();
    await expect(page.getByTestId("score-a")).toHaveText("1");
    await page.getByRole("button", { name: "ACE", exact: true }).click();
    await page.getByTestId("save-technical-action").click();
    await expect(page.getByText(/ACE/).first()).toBeVisible();

    await page.getByTestId("point-b").click();
    await expect(page.getByTestId("score-b")).toHaveText("1");
    await page.getByRole("button", { name: "ATAQUE", exact: true }).click();
    await page.getByTestId("save-technical-action").click();
    await page.getByTestId("correct-last-point").click();
    await expect(page.getByTestId("score-a")).toHaveText("2");
    await expect(page.getByTestId("score-b")).toHaveText("0");

    for (let score = 3; score <= 11; score += 1) {
      await page.getByTestId("point-a").click();
      await expect(page.getByTestId("score-a")).toHaveText(String(score));
    }
    await expect(page.getByTestId("match-review")).toContainText("FIM DE JOGO");
    await page.getByTestId("submit-review").click();
    await expect(page.getByTestId("match-review")).toContainText(
      "under_review",
    );
  });

  test("athlete reads own result and statistics on mobile", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile");
    await login(page, "athlete@test.ur.local");
    await page.goto("/athlete/ur-play");
    await expect(
      page.getByRole("heading", { name: "MEUS RESULTADOS" }),
    ).toBeVisible();
    await expect(page.getByText("EM REVISÃO").first()).toBeVisible();
    await expect(
      page.getByText("MINHAS ESTATÍSTICAS HOMOLOGADAS"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /PONTO|HOMOLOGAR/ }),
    ).toHaveCount(0);
    await page.goto("/athlete/points");
    await expect(
      page.getByRole("heading", { name: "Meus pontos" }),
    ).toBeVisible();
    await expect(
      page.getByText("Pontos da temporada", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /REPROCESSAR|EDITAR/ }),
    ).toHaveCount(0);
  });

  test("coordinator homologates the reviewed result", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium");
    await login(page, "polemanager@test.ur.local");
    await page.goto(`/ops/matches/${fixture.matchId}`);
    await expect(page.getByTestId("match-review")).toContainText(
      "under_review",
    );
    await page.getByTestId("homologate-result").click();
    await expect(page.getByTestId("match-review")).toContainText("homologated");
  });

  test("admin corrects a homologated result and preserves history", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium");
    test.setTimeout(90_000);
    await login(page, "admin@test.ur.local");
    await page.goto(`/ops/matches/${fixture.matchId}`);
    await expect(page.getByText("HISTÓRICO DO RESULTADO")).toBeVisible();
    await page.getByTestId("request-result-correction").click();
    await page.getByTestId("correct-last-point").click();
    await expect(page.getByTestId("score-a")).toHaveText("10");
    await page.getByTestId("point-a").click();
    await expect(page.getByTestId("score-a")).toHaveText("11");
    await page.getByTestId("submit-review").click();
    await page.getByTestId("homologate-result").click();
    await expect(page.getByTestId("match-review")).toContainText("homologated");
    await expect(page.getByText(/^v[2-9]/).first()).toBeVisible();
    await page.goto("/admin/ranking-engine");
    await expect(
      page.getByRole("heading", { name: "Motor de pontuação" }),
    ).toBeVisible();
    await page.goto(`/admin/ranking-engine/matches/${fixture.matchId}`);
    await expect(
      page.getByRole("heading", { name: "TRANSAÇÕES" }),
    ).toBeVisible();
    const before = await page.getByTestId("ranking-transaction").count();
    await page.getByRole("button", { name: "REPROCESSAR PONTUAÇÃO" }).click();
    await expect(
      page.getByText("Sem duplicação: entrada inalterada."),
    ).toBeVisible();
    const after = await page.getByTestId("ranking-transaction").count();
    expect(after).toBe(before);
  });

  test("athlete reads homologated points on desktop without ranking position", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium");
    await login(page, "athlete@test.ur.local");
    await page.goto("/athlete/points");
    await expect(
      page.getByRole("heading", { name: "Meus pontos" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "HISTÓRICO" }),
    ).toBeVisible();
    await expect(
      page.getByRole("main").getByText(fixture.athleteName).first(),
    ).toHaveCount(0);
    await expect(page.getByRole("table")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /REPROCESSAR|EDITAR|AJUSTAR/ }),
    ).toHaveCount(0);
  });
});
