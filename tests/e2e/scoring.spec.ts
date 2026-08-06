import { expect, test, type Page } from "@playwright/test";
import { createScoringE2EFixture } from "./scoring-fixture";

const password = process.env.UR_TEST_PASSWORD ?? "";
if (!password)
  throw new Error("UR_TEST_PASSWORD is required for scoring E2E tests.");

async function login(page: Page, email: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.context().clearCookies();
      await page.goto("/login");
      await page.getByLabel("E-mail").fill(email);
      await page.getByLabel("Senha").fill(password);
      await page.getByRole("button", { name: "Entrar" }).click();
      await expect(page).not.toHaveURL(/\/login$/, { timeout: 30_000 });
      return;
    } catch (error) {
      lastError = error;
      if (attempt === 2) throw error;
      await page.waitForTimeout(1_500);
    }
  }
  throw lastError;
}

async function expectReviewStatus(page: Page, status: string) {
  await expect(page.getByTestId("match-review")).toContainText(status, {
    timeout: 30_000,
  });
}

async function expectScore(page: Page, sideA: string, sideB: string) {
  await expect
    .poll(
      async () => {
        await page.reload();
        return {
          sideA: (await page.getByTestId("score-a").textContent())?.trim(),
          sideB: (await page.getByTestId("score-b").textContent())?.trim(),
        };
      },
      { timeout: 45_000 },
    )
    .toEqual({ sideA, sideB });
}

async function expectScoreInPlace(page: Page, sideA: string, sideB: string) {
  await expect
    .poll(
      async () => ({
        sideA: (await page.getByTestId("score-a").textContent())?.trim(),
        sideB: (await page.getByTestId("score-b").textContent())?.trim(),
      }),
      { timeout: 45_000 },
    )
    .toEqual({ sideA, sideB });
}

async function expectRecoverableHeading(page: Page, name: string | RegExp) {
  await expect
    .poll(
      async () => {
        if (await page.getByRole("button", { name: "TENTAR NOVAMENTE" }).count())
          await page.getByRole("button", { name: "TENTAR NOVAMENTE" }).click();
        return page.getByRole("heading", { name }).count();
      },
      { timeout: 60_000 },
    )
    .toBeGreaterThan(0);
}

test.describe.serial("Sprint 8 scoring journey", () => {
  let fixture: Awaited<ReturnType<typeof createScoringE2EFixture>>;

  test.beforeAll(async ({}, testInfo) => {
    testInfo.setTimeout(120_000);
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
    await expectScore(page, "2", "0");

    for (let score = 3; score <= 11; score += 1) {
      await page.getByTestId("point-a").click();
      await expect(page.getByTestId("score-a")).toHaveText(String(score));
    }
    await expect(page.getByTestId("match-review")).toContainText("FIM DE JOGO");
    await page.getByTestId("submit-review").click();
    await expectReviewStatus(page, "under_review");
  });

  test("athlete reads own result and statistics on mobile", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile");
    test.setTimeout(120_000);
    await login(page, "athlete@test.ur.local");
    await page.goto("/athlete/ur-play");
    await expectRecoverableHeading(page, "MEUS RESULTADOS");
    await expect(page.getByText("EM REVISÃO").first()).toBeVisible();
    await expect(
      page.getByText("MINHAS ESTATÍSTICAS HOMOLOGADAS"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /PONTO|HOMOLOGAR/ }),
    ).toHaveCount(0);
    await page.goto("/athlete/points");
    await expectRecoverableHeading(page, "Meus pontos");
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
    await expectReviewStatus(page, "under_review");
    await page.getByTestId("homologate-result").click();
    await expectReviewStatus(page, "homologated");
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
    await expectScoreInPlace(page, "10", "1");
    await page.getByTestId("point-a").click();
    await expectScoreInPlace(page, "11", "1");
    await page.getByTestId("submit-review").click();
    await page.getByTestId("homologate-result").click();
    await expectReviewStatus(page, "homologated");
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
    await expectRecoverableHeading(page, "Meus pontos");
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
