create type public.ranking_classification_type as enum ('individual','team','pole','doubles','fours');
create type public.ranking_snapshot_reason as enum ('daily','weekly','cycle_close','season_close','manual','pre_event','post_event');
create type public.ranking_publication_status as enum ('provisional','official','closed');
create type public.ranking_operation_type as enum ('snapshot','cycle_close','season_close','publication','retroactive_correction');

create table public.ranking_entries (
  id uuid primary key default gen_random_uuid(),
  ranking_type public.ranking_classification_type not null,
  season_id uuid not null references public.seasons(id) on delete restrict,
  cycle_id uuid references public.season_cycles(id) on delete restrict,
  entity_id uuid not null,
  entity_code text,
  display_name text not null,
  level public.athlete_level,
  team_id uuid references public.teams(id) on delete restrict,
  team_name text,
  pole_id uuid references public.poles(id) on delete restrict,
  pole_name text,
  category_code text,
  format_code text,
  total_points integer not null default 0,
  participation_points integer not null default 0,
  result_points integer not null default 0,
  technical_points integer not null default 0,
  bonus_points integer not null default 0,
  penalty_points integer not null default 0,
  disciplinary_balance integer not null default 0,
  games_played integer not null default 0 check (games_played >= 0),
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  win_rate numeric(7,4) not null default 0 check (win_rate between 0 and 100),
  aces integer not null default 0 check (aces >= 0),
  attacks integer not null default 0 check (attacks >= 0),
  blocks integer not null default 0 check (blocks >= 0),
  defenses integer not null default 0 check (defenses >= 0),
  assists integer not null default 0 check (assists >= 0),
  athletes_contributing integer not null default 0 check (athletes_contributing >= 0),
  teams_contributing integer not null default 0 check (teams_contributing >= 0),
  current_position integer check (current_position > 0),
  general_position integer check (general_position > 0),
  previous_position integer check (previous_position > 0),
  position_change integer,
  movement text not null default 'new' check (movement in ('up','down','stable','new')),
  reached_score_at timestamptz not null,
  refreshed_at timestamptz not null default now(),
  unique nulls not distinct (ranking_type, season_id, cycle_id, entity_id)
);

create table public.ranking_contributions (
  id uuid primary key default gen_random_uuid(),
  ranking_type public.ranking_classification_type not null check (ranking_type <> 'individual'),
  season_id uuid not null references public.seasons(id) on delete restrict,
  cycle_id uuid references public.season_cycles(id) on delete restrict,
  entity_id uuid not null,
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  athlete_code text not null,
  athlete_name text not null,
  points integer not null,
  refreshed_at timestamptz not null default now(),
  unique nulls not distinct (ranking_type, season_id, cycle_id, entity_id, athlete_id)
);

create table public.ranking_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_batch_id uuid not null,
  ranking_type public.ranking_classification_type not null,
  season_id uuid not null references public.seasons(id) on delete restrict,
  cycle_id uuid references public.season_cycles(id) on delete restrict,
  entity_id uuid not null,
  level public.athlete_level,
  position integer not null check (position > 0),
  total_points integer not null,
  captured_at timestamptz not null default now(),
  snapshot_reason public.ranking_snapshot_reason not null,
  captured_by uuid not null references public.profiles(id) on delete restrict
);

create table public.ranking_periods (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete restrict,
  cycle_id uuid references public.season_cycles(id) on delete restrict,
  status public.ranking_publication_status not null default 'provisional',
  published_at timestamptz,
  closed_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid not null references public.profiles(id) on delete restrict,
  unique nulls not distinct (season_id, cycle_id),
  constraint ranking_period_dates check (
    (status = 'provisional')
    or (status = 'official' and published_at is not null)
    or (status = 'closed' and published_at is not null and closed_at is not null)
  )
);

create table public.ranking_operations (
  id uuid primary key default gen_random_uuid(),
  operation_type public.ranking_operation_type not null,
  season_id uuid not null references public.seasons(id) on delete restrict,
  cycle_id uuid references public.season_cycles(id) on delete restrict,
  snapshot_batch_id uuid,
  reason text not null check (char_length(trim(reason)) between 5 and 500),
  before_state jsonb not null default '{}'::jsonb,
  after_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id) on delete restrict
);

create index ranking_entries_scope_position
on public.ranking_entries(ranking_type, season_id, cycle_id, level, current_position);
create index ranking_entries_search
on public.ranking_entries(ranking_type, season_id, (lower(display_name)) text_pattern_ops);
create index ranking_entries_season on public.ranking_entries(season_id);
create index ranking_entries_cycle on public.ranking_entries(cycle_id) where cycle_id is not null;
create index ranking_entries_team on public.ranking_entries(team_id) where team_id is not null;
create index ranking_entries_pole on public.ranking_entries(pole_id) where pole_id is not null;
create index ranking_contributions_entity
on public.ranking_contributions(ranking_type, season_id, cycle_id, entity_id, points desc);
create index ranking_contributions_season on public.ranking_contributions(season_id);
create index ranking_contributions_cycle on public.ranking_contributions(cycle_id) where cycle_id is not null;
create index ranking_contributions_athlete on public.ranking_contributions(athlete_id, season_id);
create index ranking_snapshots_entity
on public.ranking_snapshots(ranking_type, season_id, cycle_id, entity_id, captured_at desc);
create index ranking_snapshots_batch on public.ranking_snapshots(snapshot_batch_id);
create index ranking_snapshots_season on public.ranking_snapshots(season_id);
create index ranking_snapshots_cycle on public.ranking_snapshots(cycle_id) where cycle_id is not null;
create index ranking_snapshots_captured_by on public.ranking_snapshots(captured_by);
create index ranking_periods_cycle on public.ranking_periods(cycle_id) where cycle_id is not null;
create index ranking_periods_updated_by on public.ranking_periods(updated_by);
create index ranking_operations_scope on public.ranking_operations(season_id, cycle_id, created_at desc);
create index ranking_operations_cycle on public.ranking_operations(cycle_id) where cycle_id is not null;
create index ranking_operations_created_by on public.ranking_operations(created_by);
create index ranking_transactions_classification_scope
on public.ranking_transactions(season_id,season_cycle_id,status,athlete_id)
include(team_id,pole_id,roster_id,match_id,rule_id,rule_code,points,transaction_type,homologated_at,created_at);

create or replace function private.reject_ranking_projection_history_mutation()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  raise exception 'ranking history is append-only' using errcode = '23514';
end $$;
revoke all on function private.reject_ranking_projection_history_mutation() from public, anon, authenticated;
create trigger ranking_snapshots_append_only before update or delete on public.ranking_snapshots
for each row execute function private.reject_ranking_projection_history_mutation();
create trigger ranking_operations_append_only before update or delete on public.ranking_operations
for each row execute function private.reject_ranking_projection_history_mutation();

create or replace function private.refresh_ranking_scope(target_season_id uuid, target_cycle_id uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.ranking_entries
  where season_id = target_season_id and cycle_id is not distinct from target_cycle_id;
  delete from public.ranking_contributions
  where season_id = target_season_id and cycle_id is not distinct from target_cycle_id;

  with tx as (
    select t.*, r.point_category,
      case when t.transaction_type = 'reversal' then -1 else 1 end as event_delta
    from public.ranking_transactions t
    join public.ranking_rules r on r.id = t.rule_id
    where t.season_id = target_season_id and t.status = 'homologated'
      and t.athlete_id is not null
      and (target_cycle_id is null or t.season_cycle_id = target_cycle_id)
  ), aggregate as (
    select athlete_id,
      sum(points)::integer total_points,
      coalesce(sum(points) filter (where point_category = 'participation'),0)::integer participation_points,
      coalesce(sum(points) filter (where point_category = 'result'),0)::integer result_points,
      coalesce(sum(points) filter (where point_category = 'technical'),0)::integer technical_points,
      coalesce(sum(points) filter (where point_category = 'bonus'),0)::integer bonus_points,
      coalesce(sum(points) filter (where point_category = 'penalty'),0)::integer penalty_points,
      greatest(coalesce(sum(event_delta) filter (where rule_code = 'PARTICIPATION'),0),0)::integer games_played,
      greatest(coalesce(sum(event_delta) filter (where rule_code = 'WIN'),0),0)::integer wins,
      greatest(coalesce(sum(event_delta) filter (where rule_code = 'LOSS'),0),0)::integer losses,
      greatest(coalesce(sum(event_delta) filter (where rule_code = 'ACE'),0),0)::integer aces,
      greatest(coalesce(sum(event_delta) filter (where rule_code = 'ATTACK'),0),0)::integer attacks,
      greatest(coalesce(sum(event_delta) filter (where rule_code = 'BLOCK'),0),0)::integer blocks,
      greatest(coalesce(sum(event_delta) filter (where rule_code = 'DEFENSE'),0),0)::integer defenses,
      greatest(coalesce(sum(event_delta) filter (where rule_code = 'ASSIST'),0),0)::integer assists,
      coalesce(max(coalesce(homologated_at,created_at)) filter (where points > 0), min(created_at)) reached_score_at
    from tx group by athlete_id having sum(points) <> 0 or sum(event_delta) filter (where rule_code='PARTICIPATION') > 0
  ), enriched as (
    select a.*, app.athlete_code, app.public_name, app.avatar_url,
      coalesce(l.level,'leveling'::public.athlete_level) level,
      membership.team_id, team.name team_name,
      coalesce(pole_assignment.pole_id,team.primary_pole_id) pole_id, pole.name pole_name,
      round(case when a.games_played > 0 then a.wins::numeric * 100 / a.games_played else 0 end,4) win_rate
    from aggregate a
    join public.athlete_public_profiles app on app.athlete_id = a.athlete_id
    left join lateral (
      select al.level from public.athlete_levels al
      where al.athlete_id=a.athlete_id and al.season_id=target_season_id and al.status='active'
      order by al.starts_at desc limit 1
    ) l on true
    left join lateral (
      select tm.team_id from public.team_memberships tm
      where tm.athlete_id=a.athlete_id and tm.season_id=target_season_id and tm.status='active'
      order by tm.starts_at desc limit 1
    ) membership on true
    left join public.teams team on team.id=membership.team_id
    left join lateral (
      select tpa.pole_id from public.team_pole_assignments tpa
      where tpa.team_id=membership.team_id and tpa.season_id=target_season_id and tpa.status='active'
      order by tpa.starts_at desc limit 1
    ) pole_assignment on true
    left join public.poles pole on pole.id=coalesce(pole_assignment.pole_id,team.primary_pole_id)
  ), ranked as (
    select e.*,
      row_number() over(order by total_points desc,wins desc,games_played desc,win_rate desc,technical_points desc,penalty_points desc,reached_score_at,athlete_id)::integer general_position,
      case when level='leveling' then null else row_number() over(partition by level order by total_points desc,wins desc,games_played desc,win_rate desc,technical_points desc,penalty_points desc,reached_score_at,athlete_id)::integer end current_position
    from enriched e
  )
  insert into public.ranking_entries(
    ranking_type,season_id,cycle_id,entity_id,entity_code,display_name,level,team_id,team_name,pole_id,pole_name,
    total_points,participation_points,result_points,technical_points,bonus_points,penalty_points,disciplinary_balance,
    games_played,wins,losses,win_rate,aces,attacks,blocks,defenses,assists,current_position,general_position,
    previous_position,position_change,movement,reached_score_at
  )
  select 'individual',target_season_id,target_cycle_id,r.athlete_id,r.athlete_code,r.public_name,r.level,r.team_id,r.team_name,r.pole_id,r.pole_name,
    r.total_points,r.participation_points,r.result_points,r.technical_points,r.bonus_points,r.penalty_points,r.penalty_points,
    r.games_played,r.wins,r.losses,r.win_rate,r.aces,r.attacks,r.blocks,r.defenses,r.assists,r.current_position,r.general_position,
    previous.position,
    case when previous.position is null or r.current_position is null then null else previous.position-r.current_position end,
    case when previous.position is null then 'new' when previous.position>r.current_position then 'up' when previous.position<r.current_position then 'down' else 'stable' end,
    r.reached_score_at
  from ranked r
  left join lateral (
    select s.position from public.ranking_snapshots s
    where s.ranking_type='individual' and s.season_id=target_season_id and s.cycle_id is not distinct from target_cycle_id and s.entity_id=r.athlete_id
    order by s.captured_at desc,s.id desc limit 1
  ) previous on true;

  with tx as (
    select t.*,r.point_category,case when t.transaction_type='reversal' then -1 else 1 end event_delta
    from public.ranking_transactions t join public.ranking_rules r on r.id=t.rule_id
    where t.season_id=target_season_id and t.status='homologated' and t.team_id is not null
      and (target_cycle_id is null or t.season_cycle_id=target_cycle_id)
  ), agg as (
    select team_id,sum(points)::integer total_points,
      coalesce(sum(points) filter(where point_category='participation'),0)::integer participation_points,
      coalesce(sum(points) filter(where point_category='result'),0)::integer result_points,
      coalesce(sum(points) filter(where point_category='technical'),0)::integer technical_points,
      coalesce(sum(points) filter(where point_category='bonus'),0)::integer bonus_points,
      coalesce(sum(points) filter(where point_category='penalty'),0)::integer penalty_points,
      count(distinct athlete_id)::integer athletes_contributing,
      coalesce(max(coalesce(homologated_at,created_at)) filter(where points>0),min(created_at)) reached_score_at
    from tx group by team_id having sum(points)<>0
  ), match_metrics as (
    select team_id,match_id,
      sum(event_delta) filter(where rule_code='PARTICIPATION') participation,
      sum(event_delta) filter(where rule_code='WIN') wins,
      sum(event_delta) filter(where rule_code='LOSS') losses
    from tx where match_id is not null group by team_id,match_id
  ), metrics as (
    select team_id,count(*) filter(where participation>0)::integer games_played,
      count(*) filter(where wins>0)::integer wins,count(*) filter(where losses>0)::integer losses
    from match_metrics group by team_id
  ), enriched as (
    select a.*,t.name display_name,t.slug entity_code,t.primary_pole_id pole_id,p.name pole_name,
      coalesce(m.games_played,0) games_played,coalesce(m.wins,0) wins,coalesce(m.losses,0) losses,
      round(case when coalesce(m.games_played,0)>0 then m.wins::numeric*100/m.games_played else 0 end,4) win_rate
    from agg a join public.teams t on t.id=a.team_id left join public.poles p on p.id=t.primary_pole_id left join metrics m on m.team_id=a.team_id
  ), ranked as (
    select e.*,row_number() over(order by total_points desc,wins desc,games_played desc,win_rate desc,technical_points desc,penalty_points desc,reached_score_at,team_id)::integer position
    from enriched e
  )
  insert into public.ranking_entries(ranking_type,season_id,cycle_id,entity_id,entity_code,display_name,pole_id,pole_name,total_points,participation_points,result_points,technical_points,bonus_points,penalty_points,disciplinary_balance,games_played,wins,losses,win_rate,athletes_contributing,current_position,general_position,previous_position,position_change,movement,reached_score_at)
  select 'team',target_season_id,target_cycle_id,r.team_id,r.entity_code,r.display_name,r.pole_id,r.pole_name,r.total_points,r.participation_points,r.result_points,r.technical_points,r.bonus_points,r.penalty_points,r.penalty_points,r.games_played,r.wins,r.losses,r.win_rate,r.athletes_contributing,r.position,r.position,previous.position,
    case when previous.position is null then null else previous.position-r.position end,
    case when previous.position is null then 'new' when previous.position>r.position then 'up' when previous.position<r.position then 'down' else 'stable' end,r.reached_score_at
  from ranked r left join lateral (
    select s.position from public.ranking_snapshots s where s.ranking_type='team' and s.season_id=target_season_id and s.cycle_id is not distinct from target_cycle_id and s.entity_id=r.team_id order by s.captured_at desc,s.id desc limit 1
  ) previous on true;

  with tx as (
    select t.*,r.point_category,case when t.transaction_type='reversal' then -1 else 1 end event_delta
    from public.ranking_transactions t join public.ranking_rules r on r.id=t.rule_id
    where t.season_id=target_season_id and t.status='homologated' and t.pole_id is not null
      and (target_cycle_id is null or t.season_cycle_id=target_cycle_id)
  ), agg as (
    select pole_id,sum(points)::integer total_points,
      coalesce(sum(points) filter(where point_category='participation'),0)::integer participation_points,
      coalesce(sum(points) filter(where point_category='result'),0)::integer result_points,
      coalesce(sum(points) filter(where point_category='technical'),0)::integer technical_points,
      coalesce(sum(points) filter(where point_category='bonus'),0)::integer bonus_points,
      coalesce(sum(points) filter(where point_category='penalty'),0)::integer penalty_points,
      count(distinct athlete_id)::integer athletes_contributing,count(distinct team_id)::integer teams_contributing,
      coalesce(max(coalesce(homologated_at,created_at)) filter(where points>0),min(created_at)) reached_score_at
    from tx group by pole_id having sum(points)<>0
  ), match_metrics as (
    select pole_id,match_id,sum(event_delta) filter(where rule_code='PARTICIPATION') participation,
      sum(event_delta) filter(where rule_code='WIN') wins,sum(event_delta) filter(where rule_code='LOSS') losses
    from tx where match_id is not null group by pole_id,match_id
  ), metrics as (
    select pole_id,count(*) filter(where participation>0)::integer games_played,count(*) filter(where wins>0)::integer wins,count(*) filter(where losses>0)::integer losses
    from match_metrics group by pole_id
  ), enriched as (
    select a.*,p.name display_name,p.slug entity_code,coalesce(m.games_played,0) games_played,coalesce(m.wins,0) wins,coalesce(m.losses,0) losses,
      round(case when coalesce(m.games_played,0)>0 then m.wins::numeric*100/m.games_played else 0 end,4) win_rate
    from agg a join public.poles p on p.id=a.pole_id left join metrics m on m.pole_id=a.pole_id
  ), ranked as (
    select e.*,row_number() over(order by total_points desc,wins desc,games_played desc,win_rate desc,reached_score_at,pole_id)::integer position from enriched e
  )
  insert into public.ranking_entries(ranking_type,season_id,cycle_id,entity_id,entity_code,display_name,pole_id,pole_name,total_points,participation_points,result_points,technical_points,bonus_points,penalty_points,disciplinary_balance,games_played,wins,losses,win_rate,athletes_contributing,teams_contributing,current_position,general_position,previous_position,position_change,movement,reached_score_at)
  select 'pole',target_season_id,target_cycle_id,r.pole_id,r.entity_code,r.display_name,r.pole_id,r.display_name,r.total_points,r.participation_points,r.result_points,r.technical_points,r.bonus_points,r.penalty_points,r.penalty_points,r.games_played,r.wins,r.losses,r.win_rate,r.athletes_contributing,r.teams_contributing,r.position,r.position,previous.position,
    case when previous.position is null then null else previous.position-r.position end,
    case when previous.position is null then 'new' when previous.position>r.position then 'up' when previous.position<r.position then 'down' else 'stable' end,r.reached_score_at
  from ranked r left join lateral (
    select s.position from public.ranking_snapshots s where s.ranking_type='pole' and s.season_id=target_season_id and s.cycle_id is not distinct from target_cycle_id and s.entity_id=r.pole_id order by s.captured_at desc,s.id desc limit 1
  ) previous on true;

  with tx as (
    select t.*,r.point_category,case when t.transaction_type='reversal' then -1 else 1 end event_delta
    from public.ranking_transactions t join public.ranking_rules r on r.id=t.rule_id
    where t.season_id=target_season_id and t.status='homologated' and t.roster_id is not null
      and (target_cycle_id is null or t.season_cycle_id=target_cycle_id)
  ), agg as (
    select roster_id,sum(points)::integer total_points,
      coalesce(sum(points) filter(where point_category='participation'),0)::integer participation_points,
      coalesce(sum(points) filter(where point_category='result'),0)::integer result_points,
      coalesce(sum(points) filter(where point_category='technical'),0)::integer technical_points,
      coalesce(sum(points) filter(where point_category='bonus'),0)::integer bonus_points,
      coalesce(sum(points) filter(where point_category='penalty'),0)::integer penalty_points,
      coalesce(max(coalesce(homologated_at,created_at)) filter(where points>0),min(created_at)) reached_score_at
    from tx group by roster_id having sum(points)<>0
  ), match_metrics as (
    select roster_id,match_id,sum(event_delta) filter(where rule_code='PARTICIPATION') participation,
      sum(event_delta) filter(where rule_code='WIN') wins,sum(event_delta) filter(where rule_code='LOSS') losses
    from tx where match_id is not null group by roster_id,match_id
  ), metrics as (
    select roster_id,count(*) filter(where participation>0)::integer games_played,count(*) filter(where wins>0)::integer wins,count(*) filter(where losses>0)::integer losses
    from match_metrics group by roster_id
  ), enriched as (
    select a.*,r.team_id,r.level,r.name roster_name,t.name team_name,t.primary_pole_id pole_id,p.name pole_name,
      f.code format_code,c.code category_code,coalesce(m.games_played,0) games_played,coalesce(m.wins,0) wins,coalesce(m.losses,0) losses,
      round(case when coalesce(m.games_played,0)>0 then m.wins::numeric*100/m.games_played else 0 end,4) win_rate
    from agg a join public.team_rosters r on r.id=a.roster_id join public.teams t on t.id=r.team_id
    join public.competitive_formats f on f.id=r.format_id join public.competitive_categories c on c.id=r.category_id
    left join public.poles p on p.id=t.primary_pole_id left join metrics m on m.roster_id=a.roster_id
    where f.code in ('doubles','fours')
  ), ranked as (
    select e.*,row_number() over(partition by format_code,level,category_code order by total_points desc,wins desc,games_played desc,win_rate desc,technical_points desc,reached_score_at,roster_id)::integer position from enriched e
  )
  insert into public.ranking_entries(ranking_type,season_id,cycle_id,entity_id,display_name,level,team_id,team_name,pole_id,pole_name,category_code,format_code,total_points,participation_points,result_points,technical_points,bonus_points,penalty_points,disciplinary_balance,games_played,wins,losses,win_rate,current_position,general_position,previous_position,position_change,movement,reached_score_at)
  select case when r.format_code='doubles' then 'doubles'::public.ranking_classification_type else 'fours'::public.ranking_classification_type end,
    target_season_id,target_cycle_id,r.roster_id,coalesce(r.roster_name,r.team_name||' '||case when r.format_code='doubles' then 'Dupla' else 'Quarteto' end),r.level,r.team_id,r.team_name,r.pole_id,r.pole_name,r.category_code,r.format_code,r.total_points,r.participation_points,r.result_points,r.technical_points,r.bonus_points,r.penalty_points,r.penalty_points,r.games_played,r.wins,r.losses,r.win_rate,r.position,r.position,previous.position,
    case when previous.position is null then null else previous.position-r.position end,
    case when previous.position is null then 'new' when previous.position>r.position then 'up' when previous.position<r.position then 'down' else 'stable' end,r.reached_score_at
  from ranked r left join lateral (
    select s.position from public.ranking_snapshots s where s.ranking_type=(case when r.format_code='doubles' then 'doubles'::public.ranking_classification_type else 'fours'::public.ranking_classification_type end) and s.season_id=target_season_id and s.cycle_id is not distinct from target_cycle_id and s.entity_id=r.roster_id order by s.captured_at desc,s.id desc limit 1
  ) previous on true;

  insert into public.ranking_contributions(ranking_type,season_id,cycle_id,entity_id,athlete_id,athlete_code,athlete_name,points)
  select kind,target_season_id,target_cycle_id,entity_id,t.athlete_id,app.athlete_code,app.public_name,sum(t.points)::integer
  from public.ranking_transactions t
  join public.athlete_public_profiles app on app.athlete_id=t.athlete_id
  left join public.team_rosters roster on roster.id=t.roster_id
  left join public.competitive_formats f on f.id=roster.format_id
  cross join lateral (
    values
      ('team'::public.ranking_classification_type,t.team_id),
      ('pole'::public.ranking_classification_type,t.pole_id),
      (case when f.code='doubles' then 'doubles'::public.ranking_classification_type when f.code='fours' then 'fours'::public.ranking_classification_type end,t.roster_id)
  ) target(kind,entity_id)
  where t.season_id=target_season_id and t.status='homologated' and t.athlete_id is not null and target.entity_id is not null and target.kind is not null
    and (target_cycle_id is null or t.season_cycle_id=target_cycle_id)
  group by kind,entity_id,t.athlete_id,app.athlete_code,app.public_name
  having sum(t.points)<>0;
end $$;
revoke all on function private.refresh_ranking_scope(uuid,uuid) from public,anon,authenticated;

create or replace function private.refresh_all_rankings(target_season_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare cycle record;
begin
  if (select auth.uid()) is not null and not (select private.has_any_role(array['admin','operator','pole_manager']::public.app_role[])) then
    raise exception 'ranking refresh denied' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(hashtext('ranking-refresh:'||target_season_id::text));
  perform private.refresh_ranking_scope(target_season_id,null);
  for cycle in select id from public.season_cycles where season_id=target_season_id loop
    perform private.refresh_ranking_scope(target_season_id,cycle.id);
  end loop;
end $$;
revoke all on function private.refresh_all_rankings(uuid) from public,anon,authenticated;
grant execute on function private.refresh_all_rankings(uuid) to authenticated;

create or replace function private.refresh_rankings_after_run()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_season uuid;
begin
  if new.status='completed' and old.status is distinct from 'completed' then
    select season_id into target_season from public.ranking_transactions where processing_run_id=new.id limit 1;
    if target_season is not null then perform private.refresh_all_rankings(target_season); end if;
  end if;
  return new;
end $$;
revoke all on function private.refresh_rankings_after_run() from public,anon,authenticated;
create trigger ranking_runs_refresh_classifications after update of status on public.ranking_processing_runs
for each row execute function private.refresh_rankings_after_run();

create view public.individual_ranking with (security_invoker=true) as
select * from public.ranking_entries where ranking_type='individual';
create view public.team_rankings with (security_invoker=true) as
select * from public.ranking_entries where ranking_type='team';
create view public.pole_rankings with (security_invoker=true) as
select * from public.ranking_entries where ranking_type='pole';
create view public.formation_rankings with (security_invoker=true) as
select * from public.ranking_entries where ranking_type in ('doubles','fours');
create view public.doubles_rankings with (security_invoker=true) as
select * from public.ranking_entries where ranking_type='doubles';
create view public.fours_rankings with (security_invoker=true) as
select * from public.ranking_entries where ranking_type='fours';
create view public.leveling_ranking_history with (security_invoker=true) as
select * from public.ranking_entries where ranking_type='individual' and level='leveling';
create view public.public_rankings with (security_invoker=true) as
select id,ranking_type,season_id,cycle_id,entity_id,entity_code,display_name,level,team_id,team_name,pole_id,pole_name,
  category_code,format_code,total_points,games_played,wins,losses,win_rate,aces,attacks,blocks,defenses,assists,
  athletes_contributing,teams_contributing,current_position,general_position,previous_position,position_change,movement,refreshed_at
from public.ranking_entries;

create or replace function public.capture_ranking_snapshot(
  target_season_id uuid,target_cycle_id uuid default null,target_reason public.ranking_snapshot_reason default 'manual'
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare batch_id uuid:=gen_random_uuid(); inserted_count integer;
begin
  if not (select private.has_any_role(array['admin']::public.app_role[])) then raise exception 'admin required' using errcode='42501'; end if;
  if target_cycle_id is not null and not exists(select 1 from public.season_cycles where id=target_cycle_id and season_id=target_season_id) then raise exception 'cycle does not belong to season' using errcode='23514'; end if;
  perform private.refresh_all_rankings(target_season_id);
  insert into public.ranking_snapshots(snapshot_batch_id,ranking_type,season_id,cycle_id,entity_id,level,position,total_points,snapshot_reason,captured_by)
  select batch_id,ranking_type,season_id,cycle_id,entity_id,level,current_position,total_points,target_reason,(select auth.uid())
  from public.ranking_entries where season_id=target_season_id and cycle_id is not distinct from target_cycle_id and current_position is not null;
  get diagnostics inserted_count=row_count;
  insert into public.ranking_operations(operation_type,season_id,cycle_id,snapshot_batch_id,reason,after_state,created_by)
  values('snapshot',target_season_id,target_cycle_id,batch_id,'Captura de snapshot '||target_reason::text,jsonb_build_object('entries',inserted_count),(select auth.uid()));
  return batch_id;
end $$;
revoke all on function public.capture_ranking_snapshot(uuid,uuid,public.ranking_snapshot_reason) from public,anon;
grant execute on function public.capture_ranking_snapshot(uuid,uuid,public.ranking_snapshot_reason) to authenticated;

create or replace function public.publish_rankings(target_season_id uuid,target_cycle_id uuid default null)
returns public.ranking_periods language plpgsql security invoker set search_path = '' as $$
declare result public.ranking_periods; prior jsonb;
begin
  if not (select private.has_any_role(array['admin']::public.app_role[])) then raise exception 'admin required' using errcode='42501'; end if;
  perform private.refresh_all_rankings(target_season_id);
  select to_jsonb(p) into prior from public.ranking_periods p where season_id=target_season_id and cycle_id is not distinct from target_cycle_id;
  insert into public.ranking_periods(season_id,cycle_id,status,published_at,updated_by)
  values(target_season_id,target_cycle_id,'provisional',now(),(select auth.uid()))
  on conflict(season_id,cycle_id) do update set published_at=now(),updated_at=now(),updated_by=(select auth.uid())
  returning * into result;
  insert into public.ranking_operations(operation_type,season_id,cycle_id,reason,before_state,after_state,created_by)
  values('publication',target_season_id,target_cycle_id,'Publicação controlada do ranking',coalesce(prior,'{}'),to_jsonb(result),(select auth.uid()));
  return result;
end $$;
revoke all on function public.publish_rankings(uuid,uuid) from public,anon;
grant execute on function public.publish_rankings(uuid,uuid) to authenticated;

create or replace function public.close_ranking_cycle(target_cycle_id uuid)
returns public.ranking_periods language plpgsql security invoker set search_path = '' as $$
declare target_season uuid; result public.ranking_periods; batch uuid; prior jsonb;
begin
  if not (select private.has_any_role(array['admin']::public.app_role[])) then raise exception 'admin required' using errcode='42501'; end if;
  select season_id into target_season from public.season_cycles where id=target_cycle_id for update;
  if target_season is null then raise exception 'ranking cycle not found' using errcode='P0002'; end if;
  perform pg_advisory_xact_lock(hashtext('ranking-cycle-close:'||target_cycle_id::text));
  select to_jsonb(p) into prior from public.ranking_periods p where cycle_id=target_cycle_id;
  batch:=public.capture_ranking_snapshot(target_season,target_cycle_id,'cycle_close');
  insert into public.ranking_periods(season_id,cycle_id,status,published_at,updated_by)
  values(target_season,target_cycle_id,'official',now(),(select auth.uid()))
  on conflict(season_id,cycle_id) do update set status='official',published_at=coalesce(ranking_periods.published_at,now()),updated_at=now(),updated_by=(select auth.uid())
  returning * into result;
  update public.season_cycles set status='closed' where id=target_cycle_id;
  insert into public.ranking_operations(operation_type,season_id,cycle_id,snapshot_batch_id,reason,before_state,after_state,created_by)
  values('cycle_close',target_season,target_cycle_id,batch,'Fechamento oficial do ciclo',coalesce(prior,'{}'),to_jsonb(result),(select auth.uid()));
  return result;
end $$;
revoke all on function public.close_ranking_cycle(uuid) from public,anon;
grant execute on function public.close_ranking_cycle(uuid) to authenticated;

create or replace function public.close_season_ranking(target_season_id uuid)
returns public.ranking_periods language plpgsql security invoker set search_path = '' as $$
declare result public.ranking_periods; batch uuid; prior jsonb;
begin
  if not (select private.has_any_role(array['admin']::public.app_role[])) then raise exception 'admin required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtext('ranking-season-close:'||target_season_id::text));
  if exists(select 1 from public.ranking_processing_runs run join public.matches m on m.id=run.source_id join public.ur_play_sessions s on s.id=m.session_id where run.source_type='match_result' and run.status in('pending','processing','failed') and s.season_id=target_season_id) then
    raise exception 'season has pending or failed ranking sources' using errcode='23514';
  end if;
  select to_jsonb(p) into prior from public.ranking_periods p where season_id=target_season_id and cycle_id is null;
  batch:=public.capture_ranking_snapshot(target_season_id,null,'season_close');
  insert into public.ranking_periods(season_id,cycle_id,status,published_at,closed_at,updated_by)
  values(target_season_id,null,'closed',now(),now(),(select auth.uid()))
  on conflict(season_id,cycle_id) do update set status='closed',published_at=coalesce(ranking_periods.published_at,now()),closed_at=now(),updated_at=now(),updated_by=(select auth.uid())
  returning * into result;
  insert into public.ranking_operations(operation_type,season_id,snapshot_batch_id,reason,before_state,after_state,created_by)
  values('season_close',target_season_id,batch,'Fechamento oficial da temporada',coalesce(prior,'{}'),to_jsonb(result),(select auth.uid()));
  return result;
end $$;
revoke all on function public.close_season_ranking(uuid) from public,anon;
grant execute on function public.close_season_ranking(uuid) to authenticated;

create or replace function private.enforce_closed_ranking_period()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare correction_reason text:=nullif(current_setting('app.ranking_correction_reason',true),''); is_closed boolean;
begin
  select exists(
    select 1 from public.ranking_periods p where p.season_id=new.season_id
      and ((p.cycle_id is null and p.status='closed')
        or (p.cycle_id is not null and p.status in('official','closed') and p.cycle_id is not distinct from new.season_cycle_id))
  ) into is_closed;
  if is_closed then
    if not (select private.has_any_role(array['admin']::public.app_role[])) or char_length(coalesce(correction_reason,''))<10 then
      raise exception 'closed ranking requires audited admin correction reason' using errcode='42501';
    end if;
    new.metadata:=new.metadata||jsonb_build_object('retroactive_reason',correction_reason);
  end if;
  return new;
end $$;
revoke all on function private.enforce_closed_ranking_period() from public,anon,authenticated;
create trigger ranking_transactions_closed_period before insert on public.ranking_transactions
for each row execute function private.enforce_closed_ranking_period();

create or replace function public.reprocess_closed_ranking_match(target_match uuid,operation_id uuid,correction_reason text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare run_id uuid; target_season uuid;
begin
  if not (select private.has_any_role(array['admin']::public.app_role[])) then raise exception 'admin required' using errcode='42501'; end if;
  if char_length(trim(correction_reason))<10 then raise exception 'correction reason must have at least 10 characters' using errcode='23514'; end if;
  perform set_config('app.ranking_correction_reason',trim(correction_reason),true);
  run_id:=private.process_homologated_match(target_match,operation_id);
  select season_id into target_season from public.ranking_transactions where processing_run_id=run_id limit 1;
  insert into public.ranking_operations(operation_type,season_id,reason,after_state,created_by)
  values('retroactive_correction',target_season,trim(correction_reason),jsonb_build_object('match_id',target_match,'processing_run_id',run_id),(select auth.uid()));
  return run_id;
end $$;
revoke all on function public.reprocess_closed_ranking_match(uuid,uuid,text) from public,anon;
grant execute on function public.reprocess_closed_ranking_match(uuid,uuid,text) to authenticated;

alter table public.ranking_entries enable row level security;
alter table public.ranking_entries force row level security;
alter table public.ranking_contributions enable row level security;
alter table public.ranking_contributions force row level security;
alter table public.ranking_snapshots enable row level security;
alter table public.ranking_snapshots force row level security;
alter table public.ranking_periods enable row level security;
alter table public.ranking_periods force row level security;
alter table public.ranking_operations enable row level security;
alter table public.ranking_operations force row level security;

create policy ranking_entries_public_read on public.ranking_entries for select to anon,authenticated using (true);
create policy ranking_contributions_context_read on public.ranking_contributions for select to authenticated using (
  (select private.has_any_role(array['admin','operator']::public.app_role[]))
  or athlete_id=(select private.current_athlete_id())
  or (ranking_type='team' and (select private.manages_team(entity_id)))
  or (ranking_type='pole' and (select private.manages_pole(entity_id)))
  or (ranking_type in('doubles','fours') and exists(select 1 from public.team_rosters r where r.id=entity_id and (select private.manages_team(r.team_id))))
);
create policy ranking_snapshots_context_read on public.ranking_snapshots for select to authenticated using (
  (select private.has_any_role(array['admin','operator']::public.app_role[]))
  or (ranking_type='individual' and entity_id=(select private.current_athlete_id()))
  or (ranking_type='team' and (select private.manages_team(entity_id)))
  or (ranking_type='pole' and (select private.manages_pole(entity_id)))
  or (ranking_type in('doubles','fours') and exists(select 1 from public.team_rosters r where r.id=entity_id and (select private.manages_team(r.team_id))))
);
create policy ranking_snapshots_admin_insert on public.ranking_snapshots for insert to authenticated
with check ((select private.has_any_role(array['admin']::public.app_role[])) and captured_by=(select auth.uid()));
create policy ranking_periods_public_read on public.ranking_periods for select to anon,authenticated using (true);
create policy ranking_periods_admin_insert on public.ranking_periods for insert to authenticated
with check ((select private.has_any_role(array['admin']::public.app_role[])) and updated_by=(select auth.uid()));
create policy ranking_periods_admin_update on public.ranking_periods for update to authenticated
using ((select private.has_any_role(array['admin']::public.app_role[])))
with check ((select private.has_any_role(array['admin']::public.app_role[])) and updated_by=(select auth.uid()));
create policy ranking_operations_admin_read on public.ranking_operations for select to authenticated
using ((select private.has_any_role(array['admin']::public.app_role[])));
create policy ranking_operations_admin_insert on public.ranking_operations for insert to authenticated
with check ((select private.has_any_role(array['admin']::public.app_role[])) and created_by=(select auth.uid()));

create trigger ranking_periods_audit after insert or update or delete on public.ranking_periods
for each row execute function private.capture_audit_log();
create trigger ranking_operations_audit after insert or update or delete on public.ranking_operations
for each row execute function private.capture_audit_log();

grant select on public.ranking_entries,public.ranking_periods,public.individual_ranking,public.team_rankings,
  public.pole_rankings,public.formation_rankings,public.doubles_rankings,public.fours_rankings,
  public.leveling_ranking_history,public.public_rankings to anon,authenticated;
grant select on public.ranking_contributions,public.ranking_snapshots,public.ranking_operations to authenticated;
grant insert on public.ranking_snapshots,public.ranking_operations to authenticated;
grant insert,update on public.ranking_periods to authenticated;
grant all on public.ranking_entries,public.ranking_contributions,public.ranking_snapshots,public.ranking_periods,public.ranking_operations to service_role;
grant select on public.individual_ranking,public.team_rankings,public.pole_rankings,public.formation_rankings,
  public.doubles_rankings,public.fours_rankings,public.leveling_ranking_history,public.public_rankings to service_role;
revoke insert,update,delete on public.ranking_entries,public.ranking_contributions from anon,authenticated;
revoke all on public.ranking_contributions,public.ranking_snapshots,public.ranking_operations from anon;

select private.refresh_all_rankings(id) from public.seasons;
