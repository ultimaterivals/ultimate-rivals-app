import { execFileSync } from "node:child_process";

import { expect, test, type Page } from "@playwright/test";

const password = process.env.UR_TEST_PASSWORD ?? "";
const databaseUrl = process.env.DATABASE_URL ?? "";

if (!password) {
  throw new Error("UR_TEST_PASSWORD is required for authenticated E2E tests.");
}
if (!databaseUrl) {
  throw new Error("Disposable DATABASE_URL is required for authenticated E2E tests.");
}

const athleteA = "b0000000-0000-4000-8000-000000000001";
const marketItem = "66000000-0000-4000-8000-000000000001";
const marketOffer = "67000000-0000-4000-8000-000000000001";
const marketOfferName = "[QA] Resgate URC";
const marketOfferCost = 40;

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
  const redemption = page.getByText(redemptionCode, { exact: true }).locator("..");
  await expect(redemption).toContainText(marketOfferName);
  await expect(redemption).toContainText("reserved");
});
