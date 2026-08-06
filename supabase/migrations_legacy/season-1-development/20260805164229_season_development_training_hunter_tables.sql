-- Season 1 completion — athlete development plans, UR training and Hunter.
-- Remote DEV applied this domain in three chunks; this first local file is intentionally complete for clean replay.

create table public.athlete_development_plans (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  season_id uuid references public.seasons(id) on delete restrict,
  cycle_id uuid references public.season_cycles(id) on delete restrict,
  version_number integer not null default 1 check (version_number > 0),
  level_snapshot public.athlete_level,
  strengths text,
  priority_1 text not null,
  priority_2 text,
  priority_3 text,
  goal_30_days text,
  hunter_goal text,
  status text not null default 'draft' check (status in ('draft','active','review_due','completed','archived')),
  review_at timestamptz,
  created_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  supersedes_plan_id uuid references public.athlete_development_plans(id) on delete restrict,
  unique (athlete_id, season_id, cycle_id, version_number)
);

create table public.development_reviews (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.athlete_development_plans(id) on delete restrict,
  review_date date not null default current_date,
  evidence jsonb not null default '{}'::jsonb,
  progress text not null,
  new_priorities jsonb not null default '[]'::jsonb,
  reviewer_profile_id uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.training_programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  level public.athlete_level,
  focus text,
  status public.entity_status not null default 'active',
  created_at timestamptz not null default now()
);

create table public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references public.training_programs(id) on delete restrict,
  calendar_event_id uuid references public.calendar_events(id) on delete restrict,
  pole_id uuid references public.poles(id) on delete restrict,
  venue_id uuid references public.venues(id) on delete restrict,
  court_id uuid references public.courts(id) on delete restrict,
  coach_profile_id uuid references public.profiles(id) on delete restrict,
  level public.athlete_level,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer check (capacity is null or capacity > 0),
  focus text,
  skills text[] not null default '{}',
  status text not null default 'planned' check (status in ('planned','open','in_progress','completed','cancelled')),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete restrict,
  constraint training_session_window check (ends_at > starts_at)
);

create table public.training_blocks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.training_sessions(id) on delete restrict,
  block_type text not null check (block_type in ('prepare','develop','solve','compete')),
  title text not null,
  description text,
  order_index smallint not null check (order_index > 0),
  duration_minutes smallint check (duration_minutes is null or duration_minutes > 0),
  unique (session_id, order_index)
);

create table public.training_attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.training_sessions(id) on delete restrict,
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  status public.ur_play_attendance_status not null default 'expected',
  checked_in_at timestamptz,
  notes text,
  unique (session_id, athlete_id)
);

create table public.training_feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.training_sessions(id) on delete restrict,
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  coach_profile_id uuid references public.profiles(id) on delete restrict,
  feedback text not null,
  visible_to_athlete boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.hunter_cycles (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.seasons(id) on delete restrict,
  name text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  status public.entity_status not null default 'active'
);

create table public.hunter_themes (
  id uuid primary key default gen_random_uuid(),
  week_number smallint not null unique check (week_number between 1 and 12),
  code text not null unique,
  name text not null,
  description text
);

create table public.hunter_missions (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid references public.hunter_cycles(id) on delete restrict,
  theme_id uuid not null references public.hunter_themes(id) on delete restrict,
  title text not null,
  description text not null,
  status public.entity_status not null default 'active'
);

create table public.athlete_hunter_progress (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  mission_id uuid not null references public.hunter_missions(id) on delete restrict,
  status text not null default 'assigned' check (status in ('assigned','in_progress','completed','not_completed')),
  coach_observed boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (athlete_id, mission_id)
);

create table public.hunter_observations (
  id uuid primary key default gen_random_uuid(),
  progress_id uuid not null references public.athlete_hunter_progress(id) on delete restrict,
  observer_profile_id uuid references public.profiles(id) on delete restrict,
  observation text not null,
  observed_at timestamptz not null default now()
);

create index athlete_development_plans_athlete on public.athlete_development_plans(athlete_id, status, created_at);
create index development_reviews_plan on public.development_reviews(plan_id, review_date);
create index training_sessions_time on public.training_sessions(starts_at, ends_at, status);
create index training_attendance_athlete on public.training_attendance(athlete_id, status);
create index training_feedback_athlete on public.training_feedback(athlete_id, visible_to_athlete);
create index athlete_hunter_progress_athlete on public.athlete_hunter_progress(athlete_id, status);

insert into public.hunter_themes(week_number, code, name)
values
  (1,'commitment','Commitment'), (2,'discipline','Discipline'), (3,'communication','Communication'),
  (4,'resilience','Resilience'), (5,'focus','Focus'), (6,'responsibility','Responsibility'),
  (7,'leadership','Leadership'), (8,'consistency','Consistency'), (9,'emotional_control','Emotional control'),
  (10,'healthy_competitiveness','Healthy competitiveness'), (11,'team_service','Team service'), (12,'legacy','Legacy')
on conflict (week_number) do update set code=excluded.code, name=excluded.name;

create or replace view public.athlete_development_summary
with (security_invoker = true)
as
select
  a.id as athlete_id,
  p.id as plan_id,
  p.level_snapshot,
  p.priority_1,
  p.priority_2,
  p.priority_3,
  p.goal_30_days,
  p.hunter_goal,
  p.review_at,
  hp.status as hunter_status,
  hm.title as hunter_mission,
  ht.code as hunter_theme
from public.athletes a
left join lateral (
  select * from public.athlete_development_plans p0
  where p0.athlete_id = a.id and p0.status in ('active','review_due')
  order by p0.created_at desc limit 1
) p on true
left join lateral (
  select * from public.athlete_hunter_progress hp0
  where hp0.athlete_id = a.id
  order by hp0.updated_at desc limit 1
) hp on true
left join public.hunter_missions hm on hm.id = hp.mission_id
left join public.hunter_themes ht on ht.id = hm.theme_id;

do $$declare table_name text;begin foreach table_name in array array[
  'athlete_development_plans','development_reviews','training_programs','training_sessions','training_blocks','training_attendance','training_feedback','hunter_cycles','hunter_themes','hunter_missions','athlete_hunter_progress','hunter_observations'
] loop execute format('alter table public.%I enable row level security', table_name); execute format('alter table public.%I force row level security', table_name); execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function private.capture_audit_log()', table_name, table_name); end loop; end$$;

create policy development_plans_read on public.athlete_development_plans for select to authenticated using (athlete_id = private.current_athlete_id() or private.has_any_role(array['admin','operator','pole_manager']::public.app_role[]));
create policy development_plans_write on public.athlete_development_plans for all to authenticated using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy development_reviews_read on public.development_reviews for select to authenticated using (exists(select 1 from public.athlete_development_plans p where p.id=plan_id and (p.athlete_id=private.current_athlete_id() or private.has_any_role(array['admin','operator','pole_manager']::public.app_role[]))));
create policy development_reviews_write on public.development_reviews for all to authenticated using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy training_read on public.training_sessions for select to authenticated using (private.has_any_role(array['admin','operator','pole_manager']::public.app_role[]) or exists(select 1 from public.training_attendance ta where ta.session_id=id and ta.athlete_id=private.current_athlete_id()));
create policy training_write on public.training_sessions for all to authenticated using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy training_programs_read on public.training_programs for select to authenticated using (status='active' or private.has_any_role(array['admin','operator']::public.app_role[]));
create policy training_programs_write on public.training_programs for all to authenticated using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy training_blocks_read on public.training_blocks for select to authenticated using (exists(select 1 from public.training_sessions ts where ts.id=session_id and (private.has_any_role(array['admin','operator','pole_manager']::public.app_role[]) or exists(select 1 from public.training_attendance ta where ta.session_id=ts.id and ta.athlete_id=private.current_athlete_id()))));
create policy training_blocks_write on public.training_blocks for all to authenticated using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy training_attendance_read on public.training_attendance for select to authenticated using (athlete_id=private.current_athlete_id() or private.has_any_role(array['admin','operator','pole_manager']::public.app_role[]));
create policy training_attendance_write on public.training_attendance for all to authenticated using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy training_feedback_read on public.training_feedback for select to authenticated using ((athlete_id=private.current_athlete_id() and visible_to_athlete) or private.has_any_role(array['admin','operator','pole_manager']::public.app_role[]));
create policy training_feedback_write on public.training_feedback for all to authenticated using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy hunter_read on public.hunter_themes for select to authenticated using (true);
create policy hunter_cycles_read on public.hunter_cycles for select to authenticated using (status='active' or private.has_any_role(array['admin','operator']::public.app_role[]));
create policy hunter_missions_read on public.hunter_missions for select to authenticated using (status='active' or private.has_any_role(array['admin','operator']::public.app_role[]));
create policy hunter_admin_write_cycles on public.hunter_cycles for all to authenticated using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy hunter_admin_write_themes on public.hunter_themes for all to authenticated using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));
create policy hunter_admin_write_missions on public.hunter_missions for all to authenticated using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy hunter_progress_read on public.athlete_hunter_progress for select to authenticated using (athlete_id=private.current_athlete_id() or private.has_any_role(array['admin','operator','pole_manager']::public.app_role[]));
create policy hunter_progress_write on public.athlete_hunter_progress for all to authenticated using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy hunter_observations_read on public.hunter_observations for select to authenticated using (exists(select 1 from public.athlete_hunter_progress hp where hp.id=progress_id and (hp.athlete_id=private.current_athlete_id() or private.has_any_role(array['admin','operator','pole_manager']::public.app_role[]))));
create policy hunter_observations_write on public.hunter_observations for all to authenticated using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));

grant select on public.athlete_development_plans, public.development_reviews, public.training_programs, public.training_sessions, public.training_blocks, public.training_attendance, public.training_feedback, public.hunter_cycles, public.hunter_themes, public.hunter_missions, public.athlete_hunter_progress, public.hunter_observations, public.athlete_development_summary to authenticated;
grant insert, update, delete on public.athlete_development_plans, public.development_reviews, public.training_programs, public.training_sessions, public.training_blocks, public.training_attendance, public.training_feedback, public.hunter_cycles, public.hunter_themes, public.hunter_missions, public.athlete_hunter_progress, public.hunter_observations to authenticated;
grant all on public.athlete_development_plans, public.development_reviews, public.training_programs, public.training_sessions, public.training_blocks, public.training_attendance, public.training_feedback, public.hunter_cycles, public.hunter_themes, public.hunter_missions, public.athlete_hunter_progress, public.hunter_observations to service_role;
