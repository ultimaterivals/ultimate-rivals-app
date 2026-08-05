-- Season 1 completion — prizes, repasses and operational finance.

create type public.prize_allocation_status as enum ('draft', 'projected', 'approved', 'announced', 'paid', 'void');
create type public.repass_allocation_status as enum ('projected', 'eligible', 'approved', 'announced', 'paid', 'void');
create type public.financial_entry_status as enum ('projected', 'pending', 'verified', 'cancelled', 'reconciled');
create type public.financial_revenue_source as enum ('ur_play', 'tournament', 'training', 'sponsorship', 'market', 'venue_event', 'custom');
create type public.financial_expense_category as enum ('court_rental', 'staff', 'referee', 'media', 'materials', 'prize', 'repass', 'venue_share', 'market_cost', 'custom');

alter table public.tournament_prize_plans
  add column if not exists title text,
  add column if not exists published_at timestamptz,
  add column if not exists frozen_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete restrict,
  add column if not exists reviewed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now(),
  add constraint tournament_prize_plans_publish_snapshot
    check (published_at is null or jsonb_typeof(frozen_snapshot) = 'object');

update public.tournament_prize_plans
set title = coalesce(title, description)
where title is null;

alter table public.tournament_prize_plans
  alter column title set not null;

create table public.tournament_prize_plan_templates (
  id uuid primary key default gen_random_uuid(),
  product public.tournament_product not null,
  code text not null unique check (code ~ '^[a-z][a-z0-9_]{1,63}$'),
  name text not null,
  currency char(3) not null default 'BRL',
  status public.entity_status not null default 'active',
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tournament_prize_template_allocations (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.tournament_prize_plan_templates(id) on delete cascade,
  award_code text not null check (award_code ~ '^[a-z][a-z0-9_]{1,63}$'),
  award_label text not null,
  amount numeric(10,2) not null check (amount >= 0),
  currency char(3) not null default 'BRL',
  sort_order smallint not null check (sort_order > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (template_id, award_code),
  unique (template_id, sort_order)
);

create table public.tournament_prize_allocations (
  id uuid primary key default gen_random_uuid(),
  prize_plan_id uuid not null references public.tournament_prize_plans(id) on delete restrict,
  award_code text not null check (award_code ~ '^[a-z][a-z0-9_]{1,63}$'),
  award_label text not null,
  amount numeric(10,2) not null check (amount >= 0),
  currency char(3) not null default 'BRL',
  status public.prize_allocation_status not null default 'draft',
  athlete_id uuid references public.athletes(id) on delete restrict,
  team_id uuid references public.teams(id) on delete restrict,
  tournament_registration_id uuid references public.tournament_registrations(id) on delete restrict,
  source_result_id uuid references public.tournament_results(id) on delete restrict,
  approved_by uuid references public.profiles(id) on delete restrict,
  approved_at timestamptz,
  announced_at timestamptz,
  paid_at timestamptz,
  void_reason text,
  frozen_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prize_allocation_paid_requires_time check (status <> 'paid' or paid_at is not null),
  constraint prize_allocation_void_reason check (status <> 'void' or char_length(trim(coalesce(void_reason, ''))) >= 5)
);

create table public.season_repass_plans (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.seasons(id) on delete restrict,
  code text not null unique check (code ~ '^[a-z][a-z0-9_]{1,63}$'),
  name text not null,
  total_amount numeric(10,2) not null check (total_amount >= 0),
  currency char(3) not null default 'BRL',
  status public.entity_status not null default 'draft',
  ranking_snapshot_id uuid references public.ranking_snapshots(id) on delete restrict,
  legends_tournament_id uuid references public.tournaments(id) on delete restrict,
  eligibility_snapshot jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  frozen_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete restrict,
  constraint season_repass_publish_snapshot check (published_at is null or jsonb_typeof(frozen_snapshot) = 'object')
);

create table public.season_repass_allocations (
  id uuid primary key default gen_random_uuid(),
  repass_plan_id uuid not null references public.season_repass_plans(id) on delete restrict,
  allocation_code text not null check (allocation_code ~ '^[a-z][a-z0-9_]{1,63}$'),
  allocation_label text not null,
  beneficiary_type text not null check (beneficiary_type in ('team','athlete')),
  rank_position smallint not null check (rank_position between 1 and 3),
  amount numeric(10,2) not null check (amount >= 0),
  currency char(3) not null default 'BRL',
  status public.repass_allocation_status not null default 'projected',
  team_id uuid references public.teams(id) on delete restrict,
  athlete_id uuid references public.athletes(id) on delete restrict,
  eligibility_evidence jsonb not null default '{}'::jsonb,
  approved_by uuid references public.profiles(id) on delete restrict,
  approved_at timestamptz,
  announced_at timestamptz,
  paid_at timestamptz,
  void_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint repass_beneficiary_shape check (
    (beneficiary_type = 'team' and team_id is null and athlete_id is null)
    or (beneficiary_type = 'athlete' and team_id is null and athlete_id is null)
    or (beneficiary_type = 'team' and team_id is not null and athlete_id is null)
    or (beneficiary_type = 'athlete' and athlete_id is not null and team_id is null)
  ),
  constraint repass_paid_requires_time check (status <> 'paid' or paid_at is not null),
  constraint repass_void_reason check (status <> 'void' or char_length(trim(coalesce(void_reason, ''))) >= 5),
  unique (repass_plan_id, allocation_code)
);

create table public.revenue_entries (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.seasons(id) on delete restrict,
  calendar_event_id uuid references public.calendar_events(id) on delete restrict,
  tournament_id uuid references public.tournaments(id) on delete restrict,
  ur_play_session_id uuid references public.ur_play_sessions(id) on delete restrict,
  pole_id uuid references public.poles(id) on delete restrict,
  venue_id uuid references public.venues(id) on delete restrict,
  charge_id uuid references public.charges(id) on delete restrict,
  payment_id uuid references public.payments(id) on delete restrict,
  source public.financial_revenue_source not null,
  category text not null,
  description text not null,
  amount numeric(12,2) not null check (amount >= 0),
  currency char(3) not null default 'BRL',
  status public.financial_entry_status not null default 'projected',
  occurred_at timestamptz,
  due_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete restrict
);

create table public.expense_entries (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.seasons(id) on delete restrict,
  calendar_event_id uuid references public.calendar_events(id) on delete restrict,
  tournament_id uuid references public.tournaments(id) on delete restrict,
  ur_play_session_id uuid references public.ur_play_sessions(id) on delete restrict,
  pole_id uuid references public.poles(id) on delete restrict,
  venue_id uuid references public.venues(id) on delete restrict,
  prize_allocation_id uuid references public.tournament_prize_allocations(id) on delete restrict,
  repass_allocation_id uuid references public.season_repass_allocations(id) on delete restrict,
  category public.financial_expense_category not null,
  description text not null,
  amount numeric(12,2) not null check (amount >= 0),
  currency char(3) not null default 'BRL',
  status public.financial_entry_status not null default 'projected',
  occurred_at timestamptz,
  due_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete restrict
);

create index tournament_prize_templates_product_idx on public.tournament_prize_plan_templates(product, status);
create index tournament_prize_template_allocations_template_idx on public.tournament_prize_template_allocations(template_id);
create index tournament_prize_allocations_plan_idx on public.tournament_prize_allocations(prize_plan_id, status);
create index tournament_prize_allocations_athlete_idx on public.tournament_prize_allocations(athlete_id, status) where athlete_id is not null;
create index tournament_prize_allocations_team_idx on public.tournament_prize_allocations(team_id, status) where team_id is not null;
create index tournament_prize_plans_tournament_idx on public.tournament_prize_plans(tournament_id, status);
create index season_repass_plans_season_idx on public.season_repass_plans(season_id, status);
create index season_repass_allocations_plan_idx on public.season_repass_allocations(repass_plan_id, status);
create index season_repass_allocations_team_idx on public.season_repass_allocations(team_id, status) where team_id is not null;
create index season_repass_allocations_athlete_idx on public.season_repass_allocations(athlete_id, status) where athlete_id is not null;
create index revenue_entries_season_status_idx on public.revenue_entries(season_id, status);
create index revenue_entries_event_idx on public.revenue_entries(calendar_event_id, status) where calendar_event_id is not null;
create index revenue_entries_venue_idx on public.revenue_entries(venue_id, status) where venue_id is not null;
create index revenue_entries_tournament_idx on public.revenue_entries(tournament_id, status) where tournament_id is not null;
create index expense_entries_season_status_idx on public.expense_entries(season_id, status);
create index expense_entries_event_idx on public.expense_entries(calendar_event_id, status) where calendar_event_id is not null;
create index expense_entries_venue_idx on public.expense_entries(venue_id, status) where venue_id is not null;
create index expense_entries_tournament_idx on public.expense_entries(tournament_id, status) where tournament_id is not null;

create or replace view public.admin_prize_repass_operations
with (security_invoker = true)
as
select
  'prize'::text as obligation_type,
  tpp.id as plan_id,
  t.id as tournament_id,
  t.name as source_name,
  t.product::text as source_type,
  tpa.id as allocation_id,
  tpa.award_label as label,
  tpa.status::text as status,
  tpa.amount,
  tpa.currency,
  tpa.athlete_id,
  a.public_name as athlete_name,
  tpa.team_id,
  tm.name as team_name,
  tpa.created_at,
  tpa.updated_at
from public.tournament_prize_allocations tpa
join public.tournament_prize_plans tpp on tpp.id = tpa.prize_plan_id
join public.tournaments t on t.id = tpp.tournament_id
left join public.athletes a on a.id = tpa.athlete_id
left join public.teams tm on tm.id = tpa.team_id
union all
select
  'repass'::text as obligation_type,
  srp.id as plan_id,
  srp.legends_tournament_id as tournament_id,
  srp.name as source_name,
  'season_repass'::text as source_type,
  sra.id as allocation_id,
  sra.allocation_label as label,
  sra.status::text as status,
  sra.amount,
  sra.currency,
  sra.athlete_id,
  a.public_name as athlete_name,
  sra.team_id,
  tm.name as team_name,
  sra.created_at,
  sra.updated_at
from public.season_repass_allocations sra
join public.season_repass_plans srp on srp.id = sra.repass_plan_id
left join public.athletes a on a.id = sra.athlete_id
left join public.teams tm on tm.id = sra.team_id;

create or replace view public.event_financial_summaries
with (security_invoker = true)
as
with ledger as (
  select
    calendar_event_id,
    tournament_id,
    ur_play_session_id,
    season_id,
    pole_id,
    venue_id,
    amount,
    status,
    'revenue'::text as entry_kind
  from public.revenue_entries
  union all
  select
    calendar_event_id,
    tournament_id,
    ur_play_session_id,
    season_id,
    pole_id,
    venue_id,
    amount,
    status,
    'expense'::text as entry_kind
  from public.expense_entries
)
select
  calendar_event_id,
  tournament_id,
  ur_play_session_id,
  season_id,
  pole_id,
  venue_id,
  coalesce(sum(amount) filter (where entry_kind = 'revenue' and status in ('verified','reconciled')), 0)::numeric(12,2) as verified_revenue,
  coalesce(sum(amount) filter (where entry_kind = 'revenue' and status in ('projected','pending')), 0)::numeric(12,2) as projected_revenue,
  coalesce(sum(amount) filter (where entry_kind = 'expense' and status in ('verified','reconciled')), 0)::numeric(12,2) as verified_expense,
  coalesce(sum(amount) filter (where entry_kind = 'expense' and status in ('projected','pending')), 0)::numeric(12,2) as projected_expense,
  (
    coalesce(sum(amount) filter (where entry_kind = 'revenue' and status in ('verified','reconciled')), 0)
    - coalesce(sum(amount) filter (where entry_kind = 'expense' and status in ('verified','reconciled')), 0)
  )::numeric(12,2) as verified_margin
from ledger
group by 1,2,3,4,5,6;

create or replace view public.venue_financial_summaries
with (security_invoker = true)
as
select
  v.id as venue_id,
  v.name as venue_name,
  v.pole_id,
  coalesce(sum(r.amount) filter (where r.status in ('verified','reconciled')), 0)::numeric(12,2) as verified_revenue,
  coalesce(sum(e.amount) filter (where e.status in ('verified','reconciled')), 0)::numeric(12,2) as verified_expense,
  (
    coalesce(sum(r.amount) filter (where r.status in ('verified','reconciled')), 0)
    - coalesce(sum(e.amount) filter (where e.status in ('verified','reconciled')), 0)
  )::numeric(12,2) as verified_margin
from public.venues v
left join public.revenue_entries r on r.venue_id = v.id
left join public.expense_entries e on e.venue_id = v.id
group by v.id, v.name, v.pole_id;

create or replace view public.sponsor_financial_summaries
with (security_invoker = true)
as
select
  metadata ->> 'sponsor_code' as sponsor_code,
  count(*)::integer as revenue_entries,
  coalesce(sum(amount) filter (where status in ('verified','reconciled')), 0)::numeric(12,2) as verified_revenue,
  coalesce(sum(amount) filter (where status in ('projected','pending')), 0)::numeric(12,2) as projected_revenue
from public.revenue_entries
where source = 'sponsorship'
group by metadata ->> 'sponsor_code';

create or replace view public.prize_obligations
with (security_invoker = true)
as
select
  tpa.id,
  tpa.prize_plan_id,
  t.product,
  t.name as tournament_name,
  tpa.award_label,
  tpa.status,
  tpa.amount,
  tpa.currency,
  tpa.athlete_id,
  a.public_name as athlete_name,
  tpa.team_id,
  tm.name as team_name,
  tpa.approved_at,
  tpa.announced_at,
  tpa.paid_at
from public.tournament_prize_allocations tpa
join public.tournament_prize_plans tpp on tpp.id = tpa.prize_plan_id
join public.tournaments t on t.id = tpp.tournament_id
left join public.athletes a on a.id = tpa.athlete_id
left join public.teams tm on tm.id = tpa.team_id;

create or replace view public.repass_obligations
with (security_invoker = true)
as
select
  sra.id,
  sra.repass_plan_id,
  srp.season_id,
  srp.name as repass_plan_name,
  sra.allocation_label,
  sra.beneficiary_type,
  sra.rank_position,
  sra.status,
  sra.amount,
  sra.currency,
  sra.athlete_id,
  a.public_name as athlete_name,
  sra.team_id,
  tm.name as team_name,
  sra.approved_at,
  sra.announced_at,
  sra.paid_at
from public.season_repass_allocations sra
join public.season_repass_plans srp on srp.id = sra.repass_plan_id
left join public.athletes a on a.id = sra.athlete_id
left join public.teams tm on tm.id = sra.team_id;

insert into public.tournament_prize_plan_templates (product, code, name, config)
values
  ('series', 'q1_ur_series_cash_prizes', 'UR Series Q1 — premiação referência', '{"admin_review_required":true,"snapshot_on_publish":true}'::jsonb),
  ('cup', 'q1_ur_cup_cash_prizes', 'UR Cup Q1 — premiação referência', '{"admin_review_required":true,"snapshot_on_publish":true}'::jsonb),
  ('legends', 'q1_ur_legends_cash_prizes', 'UR Legends Q1 — premiação referência', '{"admin_review_required":true,"snapshot_on_publish":true}'::jsonb)
on conflict (code) do update
set name = excluded.name,
    config = excluded.config,
    updated_at = now();

insert into public.tournament_prize_template_allocations (template_id, award_code, award_label, amount, sort_order)
select tpl.id, item.award_code, item.award_label, item.amount, item.sort_order
from public.tournament_prize_plan_templates tpl
join (
  values
    ('q1_ur_series_cash_prizes', 'champion', 'Campeão', 800.00::numeric, 1::smallint),
    ('q1_ur_series_cash_prizes', 'runner_up', 'Vice', 400.00::numeric, 2::smallint),
    ('q1_ur_series_cash_prizes', 'third_place', '3º', 300.00::numeric, 3::smallint),
    ('q1_ur_series_cash_prizes', 'mvp', 'MVP', 500.00::numeric, 4::smallint),
    ('q1_ur_cup_cash_prizes', 'champion', 'Campeão', 1200.00::numeric, 1::smallint),
    ('q1_ur_cup_cash_prizes', 'runner_up', 'Vice', 800.00::numeric, 2::smallint),
    ('q1_ur_cup_cash_prizes', 'third_place', '3º', 500.00::numeric, 3::smallint),
    ('q1_ur_cup_cash_prizes', 'mvp', 'MVP', 700.00::numeric, 4::smallint),
    ('q1_ur_legends_cash_prizes', 'champion', 'Campeão', 800.00::numeric, 1::smallint),
    ('q1_ur_legends_cash_prizes', 'runner_up', 'Vice', 400.00::numeric, 2::smallint),
    ('q1_ur_legends_cash_prizes', 'third_place', '3º', 300.00::numeric, 3::smallint),
    ('q1_ur_legends_cash_prizes', 'mvp', 'MVP', 500.00::numeric, 4::smallint)
) as item(template_code, award_code, award_label, amount, sort_order)
  on item.template_code = tpl.code
on conflict (template_id, award_code) do update
set award_label = excluded.award_label,
    amount = excluded.amount,
    sort_order = excluded.sort_order;

insert into public.season_repass_plans (code, name, total_amount, currency, status, eligibility_snapshot, frozen_snapshot)
values (
  'q1_official_repass_5000',
  'Repasse trimestral oficial Q1 — referência',
  5000.00,
  'BRL',
  'draft',
  '{"ranking_source":"final homologado","eligibility_required":true,"legends_is_delivery_stage":true,"legends_does_not_redefine_quarterly_ranking":true}'::jsonb,
  '{"team_allocations":[1500,1000,1000],"athlete_allocations":[500,500,500]}'::jsonb
)
on conflict (code) do update
set name = excluded.name,
    total_amount = excluded.total_amount,
    eligibility_snapshot = excluded.eligibility_snapshot,
    frozen_snapshot = excluded.frozen_snapshot,
    updated_at = now();

insert into public.season_repass_allocations (repass_plan_id, allocation_code, allocation_label, beneficiary_type, rank_position, amount)
select plan.id, item.allocation_code, item.allocation_label, item.beneficiary_type, item.rank_position, item.amount
from public.season_repass_plans plan
join (
  values
    ('team_1', '1ª equipe elegível', 'team', 1::smallint, 1500.00::numeric),
    ('team_2', '2ª equipe elegível', 'team', 2::smallint, 1000.00::numeric),
    ('team_3', '3ª equipe elegível', 'team', 3::smallint, 1000.00::numeric),
    ('athlete_1', '1º atleta', 'athlete', 1::smallint, 500.00::numeric),
    ('athlete_2', '2º atleta', 'athlete', 2::smallint, 500.00::numeric),
    ('athlete_3', '3º atleta', 'athlete', 3::smallint, 500.00::numeric)
) as item(allocation_code, allocation_label, beneficiary_type, rank_position, amount)
  on plan.code = 'q1_official_repass_5000'
on conflict (repass_plan_id, allocation_code) do update
set allocation_label = excluded.allocation_label,
    beneficiary_type = excluded.beneficiary_type,
    rank_position = excluded.rank_position,
    amount = excluded.amount;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'tournament_prize_plans',
    'tournament_prize_plan_templates',
    'tournament_prize_template_allocations',
    'tournament_prize_allocations',
    'season_repass_plans',
    'season_repass_allocations',
    'revenue_entries',
    'expense_entries'
  ]
  loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', table_name, table_name);
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function private.set_updated_at()', table_name, table_name);
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('drop trigger if exists %I_audit on public.%I', table_name, table_name);
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function private.capture_audit_log()', table_name, table_name);
  end loop;
end $$;

drop policy if exists tournament_prizes_admin on public.tournament_prize_plans;
drop policy if exists tournament_prizes_read on public.tournament_prize_plans;

create policy tournament_prize_plans_read on public.tournament_prize_plans
  for select to authenticated
  using (exists (select 1 from public.tournaments t where t.id = tournament_id and private.can_read_tournament(t.id)));
create policy tournament_prize_plans_insert on public.tournament_prize_plans
  for insert to authenticated
  with check (private.has_any_role(array['admin']::public.app_role[]));
create policy tournament_prize_plans_update on public.tournament_prize_plans
  for update to authenticated
  using (private.has_any_role(array['admin']::public.app_role[]))
  with check (private.has_any_role(array['admin']::public.app_role[]));
create policy tournament_prize_plans_delete on public.tournament_prize_plans
  for delete to authenticated
  using (private.has_any_role(array['admin']::public.app_role[]));

create policy prize_templates_read on public.tournament_prize_plan_templates
  for select to authenticated
  using (status = 'active' or private.has_any_role(array['admin','operator']::public.app_role[]));
create policy prize_templates_insert on public.tournament_prize_plan_templates
  for insert to authenticated
  with check (private.has_any_role(array['admin']::public.app_role[]));
create policy prize_templates_update on public.tournament_prize_plan_templates
  for update to authenticated
  using (private.has_any_role(array['admin']::public.app_role[]))
  with check (private.has_any_role(array['admin']::public.app_role[]));
create policy prize_templates_delete on public.tournament_prize_plan_templates
  for delete to authenticated
  using (private.has_any_role(array['admin']::public.app_role[]));

create policy prize_template_allocations_read on public.tournament_prize_template_allocations
  for select to authenticated
  using (exists (
    select 1 from public.tournament_prize_plan_templates tpl
    where tpl.id = template_id
      and (tpl.status = 'active' or private.has_any_role(array['admin','operator']::public.app_role[]))
  ));
create policy prize_template_allocations_insert on public.tournament_prize_template_allocations
  for insert to authenticated
  with check (private.has_any_role(array['admin']::public.app_role[]));
create policy prize_template_allocations_update on public.tournament_prize_template_allocations
  for update to authenticated
  using (private.has_any_role(array['admin']::public.app_role[]))
  with check (private.has_any_role(array['admin']::public.app_role[]));
create policy prize_template_allocations_delete on public.tournament_prize_template_allocations
  for delete to authenticated
  using (private.has_any_role(array['admin']::public.app_role[]));

create policy prize_allocations_read on public.tournament_prize_allocations
  for select to authenticated
  using (
    athlete_id = private.current_athlete_id()
    or private.has_any_role(array['admin','operator']::public.app_role[])
    or exists (select 1 from public.teams t where t.id = team_id and private.manages_team(t.id))
    or exists (
      select 1
      from public.tournament_prize_plans tpp
      join public.tournaments t on t.id = tpp.tournament_id
      where tpp.id = prize_plan_id and private.can_read_tournament(t.id)
    )
  );
create policy prize_allocations_insert on public.tournament_prize_allocations
  for insert to authenticated
  with check (private.has_any_role(array['admin']::public.app_role[]));
create policy prize_allocations_update on public.tournament_prize_allocations
  for update to authenticated
  using (private.has_any_role(array['admin']::public.app_role[]))
  with check (private.has_any_role(array['admin']::public.app_role[]));
create policy prize_allocations_delete on public.tournament_prize_allocations
  for delete to authenticated
  using (private.has_any_role(array['admin']::public.app_role[]));

create policy repass_plans_read on public.season_repass_plans
  for select to authenticated
  using (status = 'active' or private.has_any_role(array['admin','operator']::public.app_role[]));
create policy repass_plans_insert on public.season_repass_plans
  for insert to authenticated
  with check (private.has_any_role(array['admin']::public.app_role[]));
create policy repass_plans_update on public.season_repass_plans
  for update to authenticated
  using (private.has_any_role(array['admin']::public.app_role[]))
  with check (private.has_any_role(array['admin']::public.app_role[]));
create policy repass_plans_delete on public.season_repass_plans
  for delete to authenticated
  using (private.has_any_role(array['admin']::public.app_role[]));

create policy repass_allocations_read on public.season_repass_allocations
  for select to authenticated
  using (
    athlete_id = private.current_athlete_id()
    or private.has_any_role(array['admin','operator']::public.app_role[])
    or exists (select 1 from public.teams t where t.id = team_id and private.manages_team(t.id))
    or (team_id is null and athlete_id is null and private.has_any_role(array['team_manager','athlete']::public.app_role[]))
  );
create policy repass_allocations_insert on public.season_repass_allocations
  for insert to authenticated
  with check (private.has_any_role(array['admin']::public.app_role[]));
create policy repass_allocations_update on public.season_repass_allocations
  for update to authenticated
  using (private.has_any_role(array['admin']::public.app_role[]))
  with check (private.has_any_role(array['admin']::public.app_role[]));
create policy repass_allocations_delete on public.season_repass_allocations
  for delete to authenticated
  using (private.has_any_role(array['admin']::public.app_role[]));

create policy revenue_entries_read on public.revenue_entries
  for select to authenticated
  using (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy revenue_entries_insert on public.revenue_entries
  for insert to authenticated
  with check (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy revenue_entries_update on public.revenue_entries
  for update to authenticated
  using (private.has_any_role(array['admin','operator']::public.app_role[]))
  with check (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy revenue_entries_delete on public.revenue_entries
  for delete to authenticated
  using (private.has_any_role(array['admin']::public.app_role[]));

create policy expense_entries_read on public.expense_entries
  for select to authenticated
  using (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy expense_entries_insert on public.expense_entries
  for insert to authenticated
  with check (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy expense_entries_update on public.expense_entries
  for update to authenticated
  using (private.has_any_role(array['admin','operator']::public.app_role[]))
  with check (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy expense_entries_delete on public.expense_entries
  for delete to authenticated
  using (private.has_any_role(array['admin']::public.app_role[]));

grant select, insert, update, delete on
  public.tournament_prize_plan_templates,
  public.tournament_prize_template_allocations,
  public.tournament_prize_allocations,
  public.season_repass_plans,
  public.season_repass_allocations,
  public.revenue_entries,
  public.expense_entries
to authenticated;

grant select on
  public.admin_prize_repass_operations,
  public.event_financial_summaries,
  public.venue_financial_summaries,
  public.sponsor_financial_summaries,
  public.prize_obligations,
  public.repass_obligations
to authenticated;

revoke all on
  public.tournament_prize_plan_templates,
  public.tournament_prize_template_allocations,
  public.tournament_prize_allocations,
  public.season_repass_plans,
  public.season_repass_allocations,
  public.revenue_entries,
  public.expense_entries
from anon;

grant select on
  public.tournament_prize_plan_templates,
  public.tournament_prize_template_allocations
to anon;

grant all on
  public.tournament_prize_plan_templates,
  public.tournament_prize_template_allocations,
  public.tournament_prize_allocations,
  public.season_repass_plans,
  public.season_repass_allocations,
  public.revenue_entries,
  public.expense_entries
to service_role;
