-- Season 1 final completion: UR Coins wallet, media metadata and report read models.

create type public.ur_coin_transaction_type as enum ('earn', 'spend', 'grant', 'reversal', 'correction', 'expire');
create type public.ur_coin_direction as enum ('credit', 'debit');
create type public.ur_coin_rule_status as enum ('draft', 'active', 'disabled', 'archived');
create type public.media_asset_type as enum ('master_video', 'proxy_video', 'highlight', 'photo', 'interview', 'sponsor_asset');
create type public.media_asset_status as enum ('private_source', 'review', 'publishable', 'public', 'archived', 'rejected');
create type public.analysis_suggestion_status as enum ('manual', 'ai_suggested', 'reviewed', 'approved', 'rejected');
create type public.analysis_suggestion_type as enum ('rally_boundary', 'athlete_identity', 'technical_action', 'highlight', 'positioning', 'custom');

create table public.ur_coin_rule_sets (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_]{1,63}$'),
  name text not null,
  status public.ur_coin_rule_status not null default 'draft',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ur_coin_rule_sets_window check (ends_at is null or ends_at > starts_at)
);

create table public.ur_coin_rules (
  id uuid primary key default gen_random_uuid(),
  rule_set_id uuid not null references public.ur_coin_rule_sets(id) on delete restrict,
  code text not null check (code ~ '^[a-z][a-z0-9_]{1,63}$'),
  name text not null,
  transaction_type public.ur_coin_transaction_type not null default 'earn',
  direction public.ur_coin_direction not null default 'credit',
  amount integer not null check (amount >= 0),
  source_type text not null,
  status public.ur_coin_rule_status not null default 'disabled',
  rule_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rule_set_id, code)
);

create table public.ur_coin_transactions (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  rule_id uuid references public.ur_coin_rules(id) on delete restrict,
  transaction_type public.ur_coin_transaction_type not null,
  direction public.ur_coin_direction not null,
  amount integer not null check (amount >= 0),
  source_type text not null,
  source_id uuid,
  season_id uuid references public.seasons(id) on delete restrict,
  idempotency_key text not null unique,
  reason text not null check (char_length(trim(reason)) >= 5),
  reversal_of uuid references public.ur_coin_transactions(id) on delete restrict,
  created_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint ur_coin_debit_has_positive_amount check (direction = 'credit' or amount > 0)
);

create view public.ur_coin_wallet_projection
with (security_invoker = true)
as
select
  athlete_id,
  coalesce(sum(case when direction = 'credit' then amount else -amount end), 0)::integer as balance,
  count(*)::integer as transaction_count,
  max(created_at) as last_transaction_at
from public.ur_coin_transactions
group by athlete_id;

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  asset_type public.media_asset_type not null,
  status public.media_asset_status not null default 'private_source',
  season_id uuid references public.seasons(id) on delete restrict,
  calendar_event_id uuid references public.calendar_events(id) on delete restrict,
  partner_event_id uuid references public.partner_events(id) on delete restrict,
  ur_play_session_id uuid references public.ur_play_sessions(id) on delete restrict,
  match_id uuid references public.matches(id) on delete restrict,
  athlete_id uuid references public.athletes(id) on delete restrict,
  team_id uuid references public.teams(id) on delete restrict,
  pole_id uuid references public.poles(id) on delete restrict,
  venue_id uuid references public.venues(id) on delete restrict,
  storage_bucket text,
  storage_path text,
  external_url text,
  title text,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_asset_location check (storage_path is not null or external_url is not null or metadata <> '{}'::jsonb),
  constraint media_asset_no_raw_video_in_db check (metadata ? 'binary_payload' = false)
);

create table public.match_media_links (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete restrict,
  media_asset_id uuid not null references public.media_assets(id) on delete restrict,
  label text,
  visible_to_athletes boolean not null default false,
  created_at timestamptz not null default now(),
  unique (match_id, media_asset_id)
);

create table public.video_annotations (
  id uuid primary key default gen_random_uuid(),
  media_asset_id uuid not null references public.media_assets(id) on delete restrict,
  match_id uuid references public.matches(id) on delete restrict,
  athlete_id uuid references public.athletes(id) on delete restrict,
  starts_at_ms integer check (starts_at_ms is null or starts_at_ms >= 0),
  ends_at_ms integer check (ends_at_ms is null or ends_at_ms >= 0),
  label text not null,
  notes text,
  status public.entity_status not null default 'active',
  created_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint video_annotation_time check (ends_at_ms is null or starts_at_ms is null or ends_at_ms >= starts_at_ms)
);

create table public.highlight_clips (
  id uuid primary key default gen_random_uuid(),
  media_asset_id uuid not null references public.media_assets(id) on delete restrict,
  match_id uuid references public.matches(id) on delete restrict,
  athlete_id uuid references public.athletes(id) on delete restrict,
  team_id uuid references public.teams(id) on delete restrict,
  title text not null,
  status public.media_asset_status not null default 'review',
  starts_at_ms integer check (starts_at_ms is null or starts_at_ms >= 0),
  ends_at_ms integer check (ends_at_ms is null or ends_at_ms >= 0),
  created_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.analysis_suggestions (
  id uuid primary key default gen_random_uuid(),
  media_asset_id uuid references public.media_assets(id) on delete restrict,
  match_id uuid references public.matches(id) on delete restrict,
  athlete_id uuid references public.athletes(id) on delete restrict,
  suggestion_type public.analysis_suggestion_type not null,
  status public.analysis_suggestion_status not null default 'manual',
  payload jsonb not null default '{}'::jsonb,
  reviewed_by uuid references public.profiles(id) on delete restrict,
  reviewed_at timestamptz,
  created_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint analysis_suggestion_review check (status not in ('approved','rejected','reviewed') or reviewed_at is not null)
);

create or replace function private.reject_ur_coin_transaction_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'UR Coin transactions are append-only' using errcode = '42501';
end;
$$;

create trigger ur_coin_transactions_append_only
before update or delete on public.ur_coin_transactions
for each row execute function private.reject_ur_coin_transaction_mutation();

revoke all on function private.reject_ur_coin_transaction_mutation() from public, anon, authenticated;

create view public.athlete_report_summary
with (security_invoker = true)
as
select
  a.id as athlete_id,
  a.athlete_code,
  a.public_name,
  al.level,
  coalesce(w.balance, 0) as ur_coin_balance,
  count(distinct mp.match_id)::integer as games,
  count(distinct tr.id)::integer as competitions,
  count(distinct ta.id) filter (where ta.status = 'present')::integer as training_attendance,
  count(distinct ahp.id) filter (where ahp.status = 'completed')::integer as hunter_completed
from public.athletes a
left join public.athlete_levels al on al.athlete_id = a.id and al.status = 'active'
left join public.ur_coin_wallet_projection w on w.athlete_id = a.id
left join public.match_participants mp on mp.athlete_id = a.id
left join public.tournament_rosters tr on tr.athlete_id = a.id
left join public.training_attendance ta on ta.athlete_id = a.id
left join public.athlete_hunter_progress ahp on ahp.athlete_id = a.id
group by a.id, a.athlete_code, a.public_name, al.level, w.balance;

create view public.team_report_summary
with (security_invoker = true)
as
select
  t.id as team_id,
  t.name,
  count(distinct tm.athlete_id) filter (where tm.status = 'active')::integer as active_athletes,
  count(distinct tr.id)::integer as rosters,
  count(distinct treg.id)::integer as tournament_registrations
from public.teams t
left join public.team_memberships tm on tm.team_id = t.id
left join public.team_rosters tr on tr.team_id = t.id
left join public.tournament_registrations treg on treg.team_id = t.id
group by t.id, t.name;

create view public.venue_report_summary
with (security_invoker = true)
as
select
  v.id as venue_id,
  v.name,
  count(distinct us.id)::integer as ur_play_sessions,
  count(distinct pe.id)::integer as partner_events,
  count(distinct c.id)::integer as courts,
  coalesce(vfs.verified_revenue, 0) as gross_revenue,
  coalesce(vfs.verified_expense, 0) as expenses,
  coalesce(vfs.verified_margin, 0) as margin
from public.venues v
left join public.courts c on c.venue_id = v.id
left join public.ur_play_sessions us on us.venue_id = v.id
left join public.partner_events pe on pe.venue_id = v.id
left join public.venue_financial_summaries vfs on vfs.venue_id = v.id
group by v.id, v.name, vfs.verified_revenue, vfs.verified_expense, vfs.verified_margin;

create view public.sponsor_report_summary
with (security_invoker = true)
as
select
  s.id as sponsor_id,
  s.name,
  count(distinct sa.id)::integer as agreements,
  count(distinct sd.id) filter (where sd.status = 'delivered')::integer as delivered,
  count(distinct mo.id)::integer as market_offers
from public.sponsors s
left join public.sponsorship_agreements sa on sa.sponsor_id = s.id
left join public.sponsorship_deliveries sd on sd.agreement_id = sa.id
left join public.sponsorship_assets asset on asset.agreement_id = sa.id
left join public.market_offers mo on mo.code = asset.metadata->>'market_offer_code'
group by s.id, s.name;

create view public.season_executive_report_summary
with (security_invoker = true)
as
select
  s.id as season_id,
  s.name,
  count(distinct a.id) filter (where a.status = 'active')::integer as active_athletes,
  count(distinct us.id)::integer as ur_play_sessions,
  count(distinct ts.id)::integer as training_sessions,
  count(distinct m.id)::integer as matches,
  count(distinct t.id)::integer as tournaments,
  coalesce(sum(re.amount) filter (where re.status in ('verified','reconciled')), 0)::numeric(12,2) as revenue,
  coalesce(sum(ex.amount) filter (where ex.status in ('verified','reconciled')), 0)::numeric(12,2) as expenses
from public.seasons s
left join public.athletes a on true
left join public.ur_play_sessions us on us.season_id = s.id
left join public.training_sessions ts on exists (
  select 1 from public.calendar_events ce
  where ce.id = ts.calendar_event_id and ce.season_id = s.id
)
left join public.ur_play_sessions mus on mus.season_id = s.id
left join public.matches m on m.session_id = mus.id
left join public.tournaments t on t.season_id = s.id
left join public.revenue_entries re on re.season_id = s.id
left join public.expense_entries ex on ex.season_id = s.id
group by s.id, s.name;

create index ur_coin_transactions_athlete_timeline on public.ur_coin_transactions(athlete_id, created_at desc);
create index ur_coin_transactions_idempotency on public.ur_coin_transactions(idempotency_key);
create index media_assets_match on public.media_assets(match_id, status) where match_id is not null;
create index media_assets_athlete on public.media_assets(athlete_id, status) where athlete_id is not null;
create index match_media_links_match on public.match_media_links(match_id);
