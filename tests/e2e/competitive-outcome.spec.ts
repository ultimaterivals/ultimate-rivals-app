import { execFileSync } from "node:child_process";

import { expect, test, type Page } from "@playwright/test";

const password = process.env.UR_TEST_PASSWORD ?? "";
const databaseUrl = process.env.DATABASE_URL ?? "";

if (!password || !databaseUrl) {
  throw new Error(
    "Disposable QA credentials are required for competitive E2E.",
  );
}

const adminId = "a0000000-0000-4000-8000-000000000001";
const athleteA = "b0000000-0000-4000-8000-000000000001";
const athleteB = "b0000000-0000-4000-8000-000000000002";
const athleteC = "b0000000-0000-4000-8000-000000000003";
const athleteD = "b0000000-0000-4000-8000-000000000004";
const seasonId = "10000000-0000-4000-8000-000000000001";
const poleId = "20000000-0000-4000-8000-000000000001";
const venueId = "30000000-0000-4000-8000-000000000001";
const teamA = "c0000000-0000-4000-8000-000000000001";
const teamB = "c0000000-0000-4000-8000-000000000002";
const sessionId = "72000000-0000-4000-8000-000000000001";
const courtId = "73000000-0000-4000-8000-000000000001";
const registrationIds = [
  "74000000-0000-4000-8000-000000000001",
  "74000000-0000-4000-8000-000000000002",
  "74000000-0000-4000-8000-000000000003",
  "74000000-0000-4000-8000-000000000004",
] as const;

function runSql(sql: string) {
  return execFileSync(
    "psql",
    [databaseUrl, "-v", "ON_ERROR_STOP=1", "-Atc", sql],
    {
      encoding: "utf8",
    },
  ).trim();
}

function asAdmin(sql: string) {
  const output = runSql(`
    set request.jwt.claims = '{"sub":"${adminId}","role":"authenticated","app_metadata":{"role":"admin"}}';
    ${sql}
  `);
  return output.split("\n").at(-1) ?? "";
}

function prepareFixture() {
  runSql(`
    insert into public.athletes (
      id, public_name, full_name, birth_date, gender, dominant_hand, status
    ) values (
      '${athleteD}'::uuid, '[QA] Athlete D', 'QA Athlete D', '2000-01-04', 'male', 'right', 'active'
    ) on conflict (id) do update set status = 'active', updated_at = now();

    insert into public.team_memberships (
      athlete_id, team_id, season_id, membership_type, starts_at, status, created_by
    ) values (
      '${athleteD}'::uuid, '${teamB}'::uuid, '${seasonId}'::uuid, 'athlete', now() - interval '1 day', 'active', '${adminId}'::uuid
    ) on conflict do nothing;

    insert into public.athlete_levels (
      athlete_id, season_id, level, status, starts_at, assigned_by, reason
    ) values (
      '${athleteD}'::uuid, '${seasonId}'::uuid, 'n2', 'active', now() - interval '1 day', '${adminId}'::uuid, '[QA] competitive outcome fixture'
    ) on conflict do nothing;

    insert into public.courts (id, venue_id, name, sport_type, status)
    values ('${courtId}'::uuid, '${venueId}'::uuid, '[QA] Court outcome', 'beach_volleyball', 'active')
    on conflict (id) do update set status = 'active', updated_at = now();

    insert into public.ur_play_sessions (
      id, season_id, pole_id, venue_id, name, session_date, starts_at, ends_at,
      registration_opens_at, registration_closes_at, capacity, waitlist_capacity,
      price_amount, status, ready_for_matchmaking, created_by, notes
    ) values (
      '${sessionId}'::uuid, '${seasonId}'::uuid, '${poleId}'::uuid, '${venueId}'::uuid,
      '[QA] Competitive outcome', current_date, now() - interval '2 hours', now() - interval '30 minutes',
      now() - interval '1 day', now() - interval '3 hours', 4, 0, 0, 'in_progress', true,
      '${adminId}'::uuid, '[QA] synthetic competitive outcome fixture'
    ) on conflict (id) do update set
      status = 'in_progress', ready_for_matchmaking = true, starts_at = excluded.starts_at,
      ends_at = excluded.ends_at, updated_at = now();

    insert into public.ur_play_session_courts (session_id, court_id, position, status)
    values ('${sessionId}'::uuid, '${courtId}'::uuid, 1, 'active')
    on conflict (session_id, court_id) do update set status = 'active';

    insert into public.ur_play_session_scopes (session_id, format_id, category_id, level)
    select '${sessionId}'::uuid, f.id, c.id, 'n2'
    from public.competitive_formats f cross join public.competitive_categories c
    where f.code = 'doubles' and c.code = 'mixed'
    on conflict do nothing;

    insert into public.ur_play_registrations (
      id, session_id, athlete_id, registration_status, source, confirmed_at,
      attendance_status, created_by, snapshot_team_id, snapshot_team_pole_id,
      snapshot_level, payment_status, payment_amount, client_operation_id
    ) values
      ('${registrationIds[0]}'::uuid, '${sessionId}'::uuid, '${athleteA}'::uuid, 'confirmed', 'admin', now(), 'checked_in', '${adminId}'::uuid, '${teamA}'::uuid, '${poleId}'::uuid, 'n2', 'not_required', 0, '74100000-0000-4000-8000-000000000001'::uuid),
      ('${registrationIds[1]}'::uuid, '${sessionId}'::uuid, '${athleteB}'::uuid, 'confirmed', 'admin', now(), 'checked_in', '${adminId}'::uuid, '${teamB}'::uuid, '${poleId}'::uuid, 'n2', 'not_required', 0, '74100000-0000-4000-8000-000000000002'::uuid),
      ('${registrationIds[2]}'::uuid, '${sessionId}'::uuid, '${athleteC}'::uuid, 'confirmed', 'admin', now(), 'checked_in', '${adminId}'::uuid, '${teamA}'::uuid, '${poleId}'::uuid, 'n2', 'not_required', 0, '74100000-0000-4000-8000-000000000003'::uuid),
      ('${registrationIds[3]}'::uuid, '${sessionId}'::uuid, '${athleteD}'::uuid, 'confirmed', 'admin', now(), 'checked_in', '${adminId}'::uuid, '${teamB}'::uuid, '${poleId}'::uuid, 'n2', 'not_required', 0, '74100000-0000-4000-8000-000000000004'::uuid)
    on conflict (id) do update set registration_status = 'confirmed', attendance_status = 'checked_in', updated_at = now();

    insert into public.ur_play_checkins (
      session_id, athlete_id, registration_id, method, checked_in_by, status, client_operation_id
    ) values
      ('${sessionId}'::uuid, '${athleteA}'::uuid, '${registrationIds[0]}'::uuid, 'manual', '${adminId}'::uuid, 'active', '75000000-0000-4000-8000-000000000001'::uuid),
      ('${sessionId}'::uuid, '${athleteB}'::uuid, '${registrationIds[1]}'::uuid, 'manual', '${adminId}'::uuid, 'active', '75000000-0000-4000-8000-000000000002'::uuid),
      ('${sessionId}'::uuid, '${athleteC}'::uuid, '${registrationIds[2]}'::uuid, 'manual', '${adminId}'::uuid, 'active', '75000000-0000-4000-8000-000000000003'::uuid),
      ('${sessionId}'::uuid, '${athleteD}'::uuid, '${registrationIds[3]}'::uuid, 'manual', '${adminId}'::uuid, 'active', '75000000-0000-4000-8000-000000000004'::uuid)
    on conflict (registration_id) do update set status = 'active';

    insert into public.match_queue_entries (session_id, athlete_id, registration_id, status)
    values
      ('${sessionId}'::uuid, '${athleteA}'::uuid, '${registrationIds[0]}'::uuid, 'waiting'),
      ('${sessionId}'::uuid, '${athleteB}'::uuid, '${registrationIds[1]}'::uuid, 'waiting'),
      ('${sessionId}'::uuid, '${athleteC}'::uuid, '${registrationIds[2]}'::uuid, 'waiting'),
      ('${sessionId}'::uuid, '${athleteD}'::uuid, '${registrationIds[3]}'::uuid, 'waiting')
    on conflict (session_id, athlete_id) do update set status = 'waiting', current_match_id = null, updated_at = now();
  `);
}

async function loginAthlete(page: Page) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("athlete@test.ur.local");
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/athlete/, { timeout: 30_000 });
}

test("homologated UR Play result processes ranking and official UR Coins exactly once", async ({
  page,
}) => {
  prepareFixture();

  const matchId = asAdmin(`
    select id
    from public.create_court_ops_match(
      '${sessionId}'::uuid,
      '${courtId}'::uuid,
      (select id from public.competitive_formats where code = 'doubles'),
      (select id from public.competitive_categories where code = 'mixed'),
      'n2',
      array['${athleteA}'::uuid, '${athleteB}'::uuid],
      array['${athleteC}'::uuid, '${athleteD}'::uuid],
      '76000000-0000-4000-8000-000000000001'::uuid
    );
  `);

  asAdmin(
    `select public.transition_court_ops_match('${matchId}'::uuid, 'called', null, '76000000-0000-4000-8000-000000000002'::uuid);`,
  );
  asAdmin(
    `select public.transition_court_ops_match('${matchId}'::uuid, 'ready', null, '76000000-0000-4000-8000-000000000003'::uuid);`,
  );
  asAdmin(
    `select public.transition_court_ops_match('${matchId}'::uuid, 'in_progress', null, '76000000-0000-4000-8000-000000000004'::uuid);`,
  );

  const sideA = runSql(
    `select id from public.match_sides where match_id='${matchId}'::uuid and side='A';`,
  );
  for (let rally = 1; rally <= 11; rally += 1) {
    asAdmin(
      `select public.record_match_rally('${matchId}'::uuid, '${sideA}'::uuid, ${rally}, ${rally}, now(), ('77000000-0000-4000-8000-' || lpad(${rally}::text, 12, '0'))::uuid);`,
    );
  }

  asAdmin(
    `select public.submit_match_for_review('${matchId}'::uuid, '76000000-0000-4000-8000-000000000005'::uuid);`,
  );
  asAdmin(
    `select public.homologate_match_result('${matchId}'::uuid, '76000000-0000-4000-8000-000000000006'::uuid);`,
  );

  expect(
    runSql(
      `select status from public.ranking_processing_runs where source_id='${matchId}'::uuid order by completed_at desc nulls last limit 1;`,
    ),
  ).toBe("completed");
  expect(
    Number(
      runSql(
        `select count(*) from public.ranking_transactions where match_id='${matchId}'::uuid and status='homologated';`,
      ),
    ),
  ).toBeGreaterThan(0);

  asAdmin(
    `select public.transition_ur_play_session('${sessionId}'::uuid, 'completed');`,
  );
  const coinRun = asAdmin(
    `select id from public.admin_process_ur_play_session_coins('${sessionId}'::uuid, '76000000-0000-4000-8000-000000000007'::uuid);`,
  );
  expect(
    runSql(
      `select status from public.ur_coin_processing_runs where id='${coinRun}'::uuid;`,
    ),
  ).toBe("completed");
  expect(
    Number(
      runSql(
        `select count(*) from public.ur_coin_transactions where metadata->>'session_id'='${sessionId}';`,
      ),
    ),
  ).toBeGreaterThan(0);

  const replay = asAdmin(
    `select id from public.admin_process_ur_play_session_coins('${sessionId}'::uuid, '76000000-0000-4000-8000-000000000007'::uuid);`,
  );
  expect(replay).toBe(coinRun);
  expect(
    Number(
      runSql(
        `select count(*) from public.ur_coin_processing_runs where session_id='${sessionId}'::uuid and status='completed';`,
      ),
    ),
  ).toBe(1);

  await loginAthlete(page);
  await page.goto("/athlete/wallet");
  await expect(page.getByRole("heading", { name: "Wallet URC" })).toBeVisible();
  await expect(page.getByText(/Histórico recente/i)).toContainText(
    /UR Play|Competição/i,
  );
});
