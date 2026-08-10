import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const password = process.env.UR_TEST_PASSWORD ?? "";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!password) {
  throw new Error("UR_TEST_PASSWORD is required for authenticated E2E tests.");
}
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Disposable Supabase admin credentials are required for authenticated E2E tests.",
  );
}

const qaAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

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

async function prepareReservationFixture() {
  const { error: opportunityError } = await qaAdmin
    .from("demand_opportunities")
    .update({ status: "forming" })
    .eq("id", reservationOpportunity);
  if (opportunityError) throw opportunityError;

  const { error: packageError } = await qaAdmin.from("packages").upsert({
    id: qaPackageId,
    code: "qa-app-reservation-credit",
    name: "[QA] App reservation credits",
    included_units: 3,
    currency: "BRL",
    list_amount: 0,
    active: true,
    benefits: [],
  });
  if (packageError) throw packageError;

  const { error: athletePackageError } = await qaAdmin
    .from("athlete_commercial_packages")
    .upsert({
      id: qaAthletePackageId,
      athlete_id: athleteA,
      package_id: qaPackageId,
      season_id: "10000000-0000-4000-8000-000000000001",
      status: "active",
      units_total: 3,
      units_used: 0,
      starts_at: new Date(Date.now() - 60_000).toISOString(),
      created_by: "a0000000-0000-4000-8000-000000000001",
    });
  if (athletePackageError) throw athletePackageError;
}

async function creditTotals() {
  const { data, error } = await qaAdmin
    .from("commercial_credit_ledger")
    .select("available_delta,reserved_delta,consumed_delta,event_type")
    .eq("athlete_id", athleteA)
    .eq("athlete_package_id", qaAthletePackageId);
  if (error) throw error;

  return (data ?? []).reduce(
    (totals, entry) => ({
      available: totals.available + Number(entry.available_delta ?? 0),
      reserved: totals.reserved + Number(entry.reserved_delta ?? 0),
      consumed: totals.consumed + Number(entry.consumed_delta ?? 0),
      events: [...totals.events, entry.event_type],
    }),
    { available: 0, reserved: 0, consumed: 0, events: [] as string[] },
  );
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
  await prepareReservationFixture();

  await expect.poll(async () => (await creditTotals()).available).toBe(3);

  await login(page, "athlete@test.ur.local", /\/athlete/);
  await page.goto("/athlete/agenda");

  const opportunity = page.getByTestId(
    `athlete-opportunity-${reservationOpportunity}`,
  );
  await opportunity.getByRole("button", { name: "Reservar vaga" }).click();
  await expect(opportunity.getByText("Reserva ativa")).toBeVisible({
    timeout: 20_000,
  });

  await expect.poll(async () => (await creditTotals()).available).toBe(2);
  await expect.poll(async () => (await creditTotals()).reserved).toBe(1);
  expect((await creditTotals()).events).toContain("hold");

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
  await expect(
    reservedOpportunity.getByRole("button", { name: "Reservar vaga" }),
  ).toBeVisible({ timeout: 20_000 });

  await expect.poll(async () => (await creditTotals()).available).toBe(3);
  await expect.poll(async () => (await creditTotals()).reserved).toBe(0);
  expect((await creditTotals()).events).toContain("release");

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
  await expect(page.getByText(/Prévia somente leitura/i)).toBeVisible();

  await page.getByRole("button", { name: "Voltar ao Command" }).click();
  await expect(page).toHaveURL(/\/admin\/preview/, { timeout: 20_000 });
  await expect(
    page.getByRole("heading", { name: "Validar o App como atleta" }),
  ).toBeVisible();
});
