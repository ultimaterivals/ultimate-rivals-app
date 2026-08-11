import { execFileSync } from "node:child_process";

import { expect, test, type Page } from "@playwright/test";

const password = process.env.UR_TEST_PASSWORD ?? "";
const databaseUrl = process.env.DATABASE_URL ?? "";

if (!password) {
  throw new Error("UR_TEST_PASSWORD is required for authenticated E2E tests.");
}
if (!databaseUrl) {
  throw new Error(
    "Disposable DATABASE_URL is required for authenticated E2E tests.",
  );
}

test.describe.configure({ mode: "serial" });

const athleteA = "b0000000-0000-4000-8000-000000000001";
const reservationOpportunity = "61000000-0000-4000-8000-000000000002";
const qaPackageId = "64000000-0000-4000-8000-000000000001";
const qaAthletePackageId = "65000000-0000-4000-8000-000000000001";

async function login(page: Page, email: string, expectedPath: RegExp) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(expectedPath, { timeout: 30_000 });
}

function runDisposableSql(sql: string) {
  return execFileSync(
    "psql",
    [databaseUrl, "-v", "ON_ERROR_STOP=1", "-Atc", sql],
    {
      encoding: "utf8",
    },
  ).trim();
}

function prepareReservationFixture() {
  runDisposableSql(`
    update public.demand_opportunities
    set status = 'forming', updated_at = now()
    where id = '${reservationOpportunity}'::uuid;

    insert into public.packages (
      id, code, name, included_units, currency, list_amount, active, benefits
    ) values (
      '${qaPackageId}'::uuid,
      'qa-app-reservation-credit',
      '[QA] App reservation credits',
      3,
      'BRL',
      0,
      true,
      '[]'::jsonb
    )
    on conflict (id) do update set
      included_units = excluded.included_units,
      active = excluded.active;

    insert into public.athlete_commercial_packages (
      id,
      athlete_id,
      package_id,
      season_id,
      status,
      units_total,
      units_used,
      starts_at,
      created_by
    ) values (
      '${qaAthletePackageId}'::uuid,
      '${athleteA}'::uuid,
      '${qaPackageId}'::uuid,
      '10000000-0000-4000-8000-000000000001'::uuid,
      'active',
      3,
      0,
      now() - interval '1 minute',
      'a0000000-0000-4000-8000-000000000001'::uuid
    )
    on conflict (id) do nothing;
  `);
}

function creditTotals() {
  const output = runDisposableSql(`
    select
      coalesce(sum(available_delta), 0)::integer || '|' ||
      coalesce(sum(reserved_delta), 0)::integer || '|' ||
      coalesce(sum(consumed_delta), 0)::integer || '|' ||
      coalesce(string_agg(event_type, ',' order by occurred_at), '')
    from public.commercial_credit_ledger
    where athlete_id = '${athleteA}'::uuid
      and athlete_package_id = '${qaAthletePackageId}'::uuid;
  `);
  const [available, reserved, consumed, events = ""] = output.split("|");

  return {
    available: Number(available),
    reserved: Number(reserved),
    consumed: Number(consumed),
    events: events ? events.split(",") : [],
  };
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

  const opportunity = page.getByTestId(
    "athlete-opportunity-61000000-0000-4000-8000-000000000001",
  );
  await opportunity
    .getByRole("button", { name: "Registrar interesse" })
    .click();
  await expect(
    opportunity.getByText("interessado", { exact: true }),
  ).toBeVisible({
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

test("athlete reservation holds credit, Command reflects it, and cancellation releases credit", async ({
  page,
}) => {
  prepareReservationFixture();

  await expect.poll(() => creditTotals().available).toBe(3);

  await login(page, "athlete@test.ur.local", /\/athlete/);
  await page.goto("/athlete/agenda");

  const opportunity = page.getByTestId(
    `athlete-opportunity-${reservationOpportunity}`,
  );
  await opportunity.getByRole("button", { name: "Reservar vaga" }).click();
  await expect(page).toHaveURL(/\/athlete\/agenda\?success=reserved/, {
    timeout: 20_000,
  });
  await expect(
    page
      .getByTestId(`athlete-opportunity-${reservationOpportunity}`)
      .getByText("Reserva ativa", { exact: true }),
  ).toBeVisible({ timeout: 20_000 });

  await expect.poll(() => creditTotals().available).toBe(2);
  await expect.poll(() => creditTotals().reserved).toBe(1);
  expect(creditTotals().events).toContain("hold");

  await login(page, "admin@test.ur.local", /\/admin/);
  await page.goto("/admin/agenda");
  const commandDemand = page.getByTestId(`demand-${reservationOpportunity}`);
  await expect(commandDemand).toContainText("2 reservas");

  await login(page, "athlete@test.ur.local", /\/athlete/);
  await page.goto("/athlete/agenda");
  const reservedOpportunity = page.getByTestId(
    `athlete-opportunity-${reservationOpportunity}`,
  );
  await reservedOpportunity
    .getByRole("button", { name: "Cancelar reserva" })
    .click();
  await expect(page).toHaveURL(/\/athlete\/agenda\?success=cancelled/, {
    timeout: 20_000,
  });
  await expect(
    page
      .getByTestId(`athlete-opportunity-${reservationOpportunity}`)
      .getByRole("button", { name: "Reservar vaga" }),
  ).toBeVisible({ timeout: 20_000 });

  await expect.poll(() => creditTotals().available).toBe(3);
  await expect.poll(() => creditTotals().reserved).toBe(0);
  expect(creditTotals().events).toContain("release");

  await login(page, "admin@test.ur.local", /\/admin/);
  await page.goto("/admin/agenda");
  await expect(
    page.getByTestId(`demand-${reservationOpportunity}`),
  ).toContainText("1 reservas");
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
  await expect(
    page.getByText(
      "Prévia somente leitura: interesse, reserva e cancelamento estão desabilitados.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Registrar interesse" }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Reservar vaga" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: "Cancelar reserva" }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "Voltar ao Command" }).click();
  await expect(page).toHaveURL(/\/admin\/preview/, { timeout: 20_000 });
  await expect(
    page.getByRole("heading", { name: "Validar o App como atleta" }),
  ).toBeVisible();
});
