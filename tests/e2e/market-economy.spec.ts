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

const athleteA = "b0000000-0000-4000-8000-000000000001";
const marketItem = "66000000-0000-4000-8000-000000000001";
const marketOffer = "67000000-0000-4000-8000-000000000001";
const marketOfferName = "[QA] Resgate URC";
const marketOfferCost = 40;
const reservationOpportunity = "61000000-0000-4000-8000-000000000002";
const reservationSession = "70000000-0000-4000-8000-000000000001";
const reservationRegistration = "71000000-0000-4000-8000-000000000001";
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
    { encoding: "utf8" },
  ).trim();
}

function prepareMarketFixture() {
  runDisposableSql(`
    insert into public.market_items (
      id, code, name, category, item_type, status
    ) values (
      '${marketItem}'::uuid,
      'qa_market_urc_item',
      '${marketOfferName}',
      'hydration',
      'product',
      'active'
    )
    on conflict (id) do update set
      name = excluded.name,
      status = excluded.status;

    insert into public.market_offers (
      id,
      item_id,
      code,
      name,
      status,
      urc_amount,
      accepts_brl,
      accepts_urc,
      starts_at,
      ends_at,
      inventory_limit,
      per_athlete_limit
    ) values (
      '${marketOffer}'::uuid,
      '${marketItem}'::uuid,
      'qa_market_urc_offer',
      '${marketOfferName}',
      'active',
      ${marketOfferCost},
      false,
      true,
      now() - interval '1 minute',
      now() + interval '1 day',
      10,
      1
    )
    on conflict (id) do update set
      name = excluded.name,
      status = excluded.status,
      urc_amount = excluded.urc_amount,
      accepts_brl = excluded.accepts_brl,
      accepts_urc = excluded.accepts_urc,
      starts_at = excluded.starts_at,
      ends_at = excluded.ends_at,
      inventory_limit = excluded.inventory_limit,
      per_athlete_limit = excluded.per_athlete_limit;

    insert into public.ur_coin_transactions (
      athlete_id,
      transaction_type,
      direction,
      amount,
      source_type,
      source_id,
      idempotency_key,
      reason,
      metadata
    ) values (
      '${athleteA}'::uuid,
      'grant',
      'credit',
      100,
      'qa_market_fixture',
      '${marketOffer}'::uuid,
      'qa-market-grant-athlete-a',
      'Saldo sintético para QA do UR Market',
      '{"source":"isolated_e2e"}'::jsonb
    )
    on conflict (idempotency_key) do nothing;
  `);
}

function prepareNoShowReservationFixture() {
  runDisposableSql(`
    update public.demand_opportunities
    set
      status = 'forming',
      starts_at = now() + interval '2 hours',
      ends_at = now() + interval '4 hours',
      updated_at = now()
    where id = '${reservationOpportunity}'::uuid;

    update public.ur_play_sessions
    set
      session_date = current_date,
      starts_at = now() + interval '2 hours',
      ends_at = now() + interval '4 hours',
      registration_closes_at = now() + interval '90 minutes',
      status = 'registration_open',
      updated_at = now()
    where id = '${reservationSession}'::uuid;

    update public.ur_play_registrations
    set attendance_status = 'expected', updated_at = now()
    where id = '${reservationRegistration}'::uuid;

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
    on conflict (id) do update set active = true;
  `);
}

function openNoShowWindow() {
  runDisposableSql(`
    update public.ur_play_sessions
    set
      session_date = current_date,
      starts_at = now() - interval '30 minutes',
      ends_at = now() + interval '90 minutes',
      registration_closes_at = now() - interval '45 minutes',
      status = 'in_progress',
      updated_at = now()
    where id = '${reservationSession}'::uuid;

    update public.demand_opportunities
    set
      status = 'confirmed',
      starts_at = now() - interval '30 minutes',
      ends_at = now() + interval '90 minutes',
      updated_at = now()
    where id = '${reservationOpportunity}'::uuid;

    update public.ur_play_registrations
    set attendance_status = 'expected', updated_at = now()
    where id = '${reservationRegistration}'::uuid;
  `);
}

function urcBalance() {
  return Number(
    runDisposableSql(`
      select coalesce(sum(
        case when direction = 'credit' then amount else -amount end
      ), 0)::integer
      from public.ur_coin_transactions
      where athlete_id = '${athleteA}'::uuid;
    `),
  );
}

function creditTotals() {
  const output = runDisposableSql(`
    select
      coalesce(sum(available_delta), 0)::integer || '|' ||
      coalesce(sum(reserved_delta), 0)::integer || '|' ||
      coalesce(sum(consumed_delta), 0)::integer
    from public.commercial_credit_ledger
    where athlete_id = '${athleteA}'::uuid
      and athlete_package_id = '${qaAthletePackageId}'::uuid;
  `);
  const [available, reserved, consumed] = output.split("|");
  return {
    available: Number(available),
    reserved: Number(reserved),
    consumed: Number(consumed),
  };
}

function redemptionSnapshot() {
  const output = runDisposableSql(`
    select status::text || '|' || redemption_code
    from public.market_redemptions
    where offer_id = '${marketOffer}'::uuid
      and athlete_id = '${athleteA}'::uuid
    order by created_at desc
    limit 1;
  `);
  const [status = "", code = ""] = output.split("|");
  return { status, code };
}

test("UR Coins redemption debits Wallet and appears reserved in Command", async ({
  page,
}) => {
  prepareMarketFixture();
  const initialBalance = urcBalance();
  expect(initialBalance).toBeGreaterThanOrEqual(marketOfferCost);

  await login(page, "athlete@test.ur.local", /\/athlete/);
  await page.goto("/athlete/market");

  await expect(
    page.getByRole("heading", { name: marketOfferName, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("heading", { name: marketOfferName, exact: true })
    .locator("xpath=ancestor::div[contains(@class,'rounded-ur')][1]")
    .getByRole("button", { name: "Resgatar com UR Coins" })
    .click();

  await expect(page).toHaveURL(/\/athlete\/market\?redeemed=1/, {
    timeout: 20_000,
  });
  await expect(
    page.getByText("Resgate reservado com sucesso.", { exact: true }),
  ).toBeVisible();

  const expectedBalance = initialBalance - marketOfferCost;
  await expect.poll(() => urcBalance()).toBe(expectedBalance);
  await expect.poll(() => redemptionSnapshot().status).toBe("reserved");
  const redemptionCode = redemptionSnapshot().code;
  expect(redemptionCode.length).toBeGreaterThan(0);

  await page.goto("/athlete/wallet");
  await expect(
    page.getByText("Saldo disponível", { exact: true }).locator(".."),
  ).toContainText(String(expectedBalance));

  await login(page, "admin@test.ur.local", /\/admin/);
  await page.goto("/admin/market");
  const redemption = page
    .getByText(redemptionCode, { exact: true })
    .locator("..");
  await expect(redemption).toContainText(marketOfferName);
  await expect(redemption).toContainText("reserved");
});

test("official no-show consumes held credit and reflects absence back into the athlete App", async ({
  page,
}) => {
  prepareNoShowReservationFixture();
  const before = creditTotals();
  expect(before.available).toBeGreaterThan(0);

  await login(page, "athlete@test.ur.local", /\/athlete/);
  await page.goto("/athlete/agenda");
  await page
    .getByTestId(`athlete-opportunity-${reservationOpportunity}`)
    .getByRole("button", { name: "Reservar vaga" })
    .click();
  await expect(page).toHaveURL(/\/athlete\/agenda\?success=reserved/, {
    timeout: 20_000,
  });
  await expect.poll(() => creditTotals().reserved).toBe(before.reserved + 1);

  openNoShowWindow();

  await login(page, "admin@test.ur.local", /\/admin/);
  await page.goto(`/admin/ur-play/presenca?session=${reservationSession}`);
  await expect(
    page.getByRole("heading", { name: "Presença UR Play" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "No-show", exact: true }).click();
  await expect(page).toHaveURL(/success=no_show/, { timeout: 20_000 });
  await expect(
    page.getByText("No-show registrado e crédito consumido de forma auditável.", {
      exact: true,
    }),
  ).toBeVisible();

  await expect.poll(() => creditTotals().available).toBe(before.available - 1);
  await expect.poll(() => creditTotals().reserved).toBe(before.reserved);
  await expect.poll(() => creditTotals().consumed).toBe(before.consumed + 1);

  await login(page, "athlete@test.ur.local", /\/athlete/);
  await page.goto("/athlete/agenda");
  await expect(
    page
      .getByTestId(`athlete-opportunity-${reservationOpportunity}`)
      .getByText("Ausência registrada", { exact: true }),
  ).toBeVisible({ timeout: 20_000 });
});
