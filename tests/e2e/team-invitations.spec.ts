import { execFileSync } from "node:child_process";

import { expect, test, type Page } from "@playwright/test";

const password = process.env.UR_TEST_PASSWORD ?? "";
const databaseUrl = process.env.DATABASE_URL ?? "";

if (!password || !databaseUrl) {
  throw new Error("Disposable QA credentials and database URL are required.");
}

const athleteId = "b0000000-0000-4000-8000-000000000002";
const teamId = "c0000000-0000-4000-8000-000000000001";
const seasonId = "10000000-0000-4000-8000-000000000001";

function sql(query: string) {
  return execFileSync(
    "psql",
    [databaseUrl, "-v", "ON_ERROR_STOP=1", "-Atc", query],
    {
      encoding: "utf8",
    },
  ).trim();
}

async function login(page: Page, email: string, expectedPath: RegExp) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(expectedPath, { timeout: 30_000 });
}

test("a team invitation requires the athlete's acceptance before membership", async ({
  page,
}) => {
  sql(`
    update public.team_memberships
    set status = 'inactive', ends_at = now() - interval '1 minute'
    where athlete_id = '${athleteId}'::uuid
      and season_id = '${seasonId}'::uuid
      and status = 'active';
  `);

  await login(page, "admin@test.ur.local", /\/admin/);
  await page.goto("/admin/equipes");
  const invitations = page.getByRole("region", {
    name: "Convites para equipe",
  });
  await invitations.getByLabel("Atleta").selectOption(athleteId);
  await invitations.getByLabel("Equipe").selectOption(teamId);
  await invitations.getByRole("button", { name: "Enviar convite" }).click();
  await expect(page).toHaveURL(/invitation-sent/);
  await expect(
    invitations.getByText("[QA] Athlete B → [QA] Team A"),
  ).toBeVisible();

  expect(
    sql(`
      select count(*) from public.team_memberships
      where athlete_id = '${athleteId}'::uuid
        and team_id = '${teamId}'::uuid
        and season_id = '${seasonId}'::uuid
        and status = 'active';
    `),
  ).toBe("0");

  await login(page, "athlete2@test.ur.local", /\/athlete/);
  await page.goto("/athlete/team");
  const invitation = page.getByRole("region", { name: "Convites para você" });
  await expect(invitation.getByText("[QA] Team A")).toBeVisible();
  await invitation.getByRole("button", { name: "Aceitar convite" }).click();
  await expect(page).toHaveURL(/invitation=accepted/);
  await expect(
    page.getByText("Convite aceito. Seu vínculo com a equipe começou agora."),
  ).toBeVisible();

  expect(
    sql(`
      select count(*) from public.team_memberships
      where athlete_id = '${athleteId}'::uuid
        and team_id = '${teamId}'::uuid
        and season_id = '${seasonId}'::uuid
        and status = 'active';
    `),
  ).toBe("1");
});
