-- Season 1 completion — master calendar and event operations.
-- Additive only. Do not edit previously applied migrations.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'calendar_event_type') then
    create type public.calendar_event_type as enum (
      'ur_play',
      'training',
      'hunter',
      'series',
      'cup',
      'legends',
      'clinic',
      'partner_event',
      'special_event'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'calendar_event_status') then
    create type public.calendar_event_status as enum (
      'draft',
      'planned',
      'published',
      'registration_open',
      'in_progress',
      'completed',
      'cancelled'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'calendar_checklist_phase') then
    create type public.calendar_checklist_phase as enum (
      'd_minus_14',
      'd_minus_7',
      'd_minus_3',
      'd_day',
      'd_plus_1',
      'd_plus_2'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'calendar_checklist_category') then
    create type public.calendar_checklist_category as enum (
      'venue',
      'courts',
      'registrations',
      'eligibility',
      'payments',
      'staff',
      'referee',
      'materials',
      'media',
      'sponsor',
      'match_ids',
      'results',
      'ranking',
      'post_event',
      'finance'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'calendar_checklist_status') then
    create type public.calendar_checklist_status as enum (
      'pending',
      'in_progress',
      'done',
      'waived',
      'blocked'
    );
  end if;
end $$;

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.seasons(id) on delete restrict,
  season_cycle_id uuid references public.season_cycles(id) on delete restrict,
  pole_id uuid references public.poles(id) on delete restrict,
  venue_id uuid references public.venues(id) on delete restrict,
  event_type public.calendar_event_type not null,
  name text not null check (char_length(trim(name)) between 3 and 140),
  status public.calendar_event_status not null default 'draft',
  competition_mode text check (competition_mode is null or competition_mode in ('rotation','scheduled_rounds','tournament')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null default 'America/Sao_Paulo',
  capacity integer check (capacity is null or capacity >= 0),
  court_count_target smallint check (court_count_target is null or court_count_target >= 1),
  notes text,
  source text not null default 'manual' check (source in ('manual','q1_template','tournament','ur_play','training','hunter','partner')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.event_occurrences (
  id uuid primary key default gen_random_uuid(),
  calendar_event_id uuid not null references public.calendar_events(id) on delete restrict,
  occurrence_starts_at timestamptz not null,
  occurrence_ends_at timestamptz not null,
  status public.calendar_event_status not null default 'planned',
  generated_from_template boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  check (occurrence_ends_at > occurrence_starts_at)
);

create table if not exists public.event_courts (
  id uuid primary key default gen_random_uuid(),
  calendar_event_id uuid not null references public.calendar_events(id) on delete restrict,
  occurrence_id uuid references public.event_occurrences(id) on delete restrict,
  court_id uuid not null references public.courts(id) on delete restrict,
  status text not null default 'planned' check (status in ('planned','confirmed','unavailable','cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  unique (calendar_event_id, occurrence_id, court_id)
);

create table if not exists public.event_staff_assignments (
  id uuid primary key default gen_random_uuid(),
  calendar_event_id uuid not null references public.calendar_events(id) on delete restrict,
  occurrence_id uuid references public.event_occurrences(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  role text not null check (role in (
    'technical_director',
    'pole_coordinator',
    'technical_evaluator',
    'referee',
    'assistant_referee',
    'score_operator',
    'performance_analyst',
    'media_operator',
    'coach'
  )),
  court_id uuid references public.courts(id) on delete restrict,
  status text not null default 'assigned' check (status in ('assigned','confirmed','declined','replaced','cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  unique (calendar_event_id, occurrence_id, profile_id, role, court_id)
);

create table if not exists public.event_checklists (
  id uuid primary key default gen_random_uuid(),
  calendar_event_id uuid not null references public.calendar_events(id) on delete restrict,
  phase public.calendar_checklist_phase not null,
  category public.calendar_checklist_category not null,
  title text not null check (char_length(trim(title)) between 3 and 160),
  status public.calendar_checklist_status not null default 'pending',
  owner_profile_id uuid references public.profiles(id) on delete restrict,
  due_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'done' and completed_at is not null) or status <> 'done')
);

create table if not exists public.calendar_q1_templates (
  id uuid primary key default gen_random_uuid(),
  pole_id uuid references public.poles(id) on delete restrict,
  name text not null,
  weekday smallint not null check (weekday between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  event_type public.calendar_event_type not null default 'ur_play',
  competition_mode text not null default 'scheduled_rounds' check (competition_mode in ('rotation','scheduled_rounds','tournament')),
  target_courts smallint not null default 1 check (target_courts >= 1),
  alternates_friday boolean not null default false,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  unique (pole_id, weekday, starts_at, ends_at, event_type)
);

alter table public.tournaments
  add column if not exists calendar_event_id uuid references public.calendar_events(id) on delete restrict;

alter table public.ur_play_sessions
  add column if not exists calendar_event_id uuid references public.calendar_events(id) on delete restrict;

create index if not exists calendar_events_time
  on public.calendar_events (starts_at, ends_at, status);
create index if not exists calendar_events_pole_type
  on public.calendar_events (pole_id, event_type, status, starts_at);
create index if not exists event_occurrences_event_time
  on public.event_occurrences (calendar_event_id, occurrence_starts_at, occurrence_ends_at);
create index if not exists event_courts_court_event
  on public.event_courts (court_id, calendar_event_id);
create index if not exists event_staff_profile_event
  on public.event_staff_assignments (profile_id, calendar_event_id, role);
create index if not exists event_checklists_event_status
  on public.event_checklists (calendar_event_id, phase, status);
create index if not exists tournaments_calendar_event
  on public.tournaments (calendar_event_id) where calendar_event_id is not null;
create index if not exists ur_play_sessions_calendar_event
  on public.ur_play_sessions (calendar_event_id) where calendar_event_id is not null;

create or replace view public.calendar_event_conflicts
with (security_invoker = true)
as
select
  'court_overlap'::text as conflict_type,
  left_event.id as calendar_event_id,
  right_event.id as conflicting_event_id,
  left_event.starts_at,
  left_event.ends_at,
  left_court.court_id,
  null::uuid as profile_id,
  'Court assigned to overlapping events'::text as detail
from public.calendar_events left_event
join public.event_courts left_court on left_court.calendar_event_id = left_event.id
join public.event_courts right_court on right_court.court_id = left_court.court_id
join public.calendar_events right_event on right_event.id = right_court.calendar_event_id
where left_event.id < right_event.id
  and left_event.status <> 'cancelled'
  and right_event.status <> 'cancelled'
  and tstzrange(left_event.starts_at, left_event.ends_at, '[)') && tstzrange(right_event.starts_at, right_event.ends_at, '[)')
union all
select
  'staff_overlap',
  left_event.id,
  right_event.id,
  left_event.starts_at,
  left_event.ends_at,
  null::uuid,
  left_staff.profile_id,
  'Staff assigned to overlapping events'
from public.calendar_events left_event
join public.event_staff_assignments left_staff on left_staff.calendar_event_id = left_event.id
join public.event_staff_assignments right_staff on right_staff.profile_id = left_staff.profile_id
join public.calendar_events right_event on right_event.id = right_staff.calendar_event_id
where left_event.id < right_event.id
  and left_event.status <> 'cancelled'
  and right_event.status <> 'cancelled'
  and left_staff.status not in ('declined','cancelled','replaced')
  and right_staff.status not in ('declined','cancelled','replaced')
  and tstzrange(left_event.starts_at, left_event.ends_at, '[)') && tstzrange(right_event.starts_at, right_event.ends_at, '[)');

create or replace view public.admin_calendar_operations
with (security_invoker = true)
as
select
  ce.id,
  ce.name,
  ce.event_type,
  ce.status,
  ce.starts_at,
  ce.ends_at,
  ce.competition_mode,
  ce.capacity,
  ce.court_count_target,
  ce.pole_id,
  p.name as pole_name,
  ce.venue_id,
  v.name as venue_name,
  count(distinct ec.court_id)::integer as assigned_courts,
  count(distinct esa.profile_id)::integer as assigned_staff,
  count(distinct chk.id) filter (where chk.status in ('pending','in_progress','blocked'))::integer as open_checklist_items,
  count(distinct cfc.conflicting_event_id)::integer as conflict_count
from public.calendar_events ce
left join public.poles p on p.id = ce.pole_id
left join public.venues v on v.id = ce.venue_id
left join public.event_courts ec on ec.calendar_event_id = ce.id and ec.status <> 'cancelled'
left join public.event_staff_assignments esa on esa.calendar_event_id = ce.id and esa.status not in ('declined','cancelled','replaced')
left join public.event_checklists chk on chk.calendar_event_id = ce.id
left join public.calendar_event_conflicts cfc on cfc.calendar_event_id = ce.id
group by ce.id, p.name, v.name;

grant select on public.admin_calendar_operations to authenticated;
grant select on public.calendar_event_conflicts to authenticated;

create or replace function private.can_read_calendar_event(target_event uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.has_any_role(array['admin','operator']::public.app_role[])
    or exists (
      select 1
      from public.calendar_events ce
      where ce.id = target_event
        and private.manages_pole(ce.pole_id)
    )
    or exists (
      select 1
      from public.event_staff_assignments esa
      where esa.calendar_event_id = target_event
        and esa.profile_id = (select auth.uid())
        and esa.status not in ('declined','cancelled','replaced')
    );
$$;

revoke all on function private.can_read_calendar_event(uuid) from public;
grant execute on function private.can_read_calendar_event(uuid) to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'calendar_events',
    'event_occurrences',
    'event_courts',
    'event_staff_assignments',
    'event_checklists',
    'calendar_q1_templates'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('drop trigger if exists %I_audit on public.%I', table_name, table_name);
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function private.capture_audit_log()', table_name, table_name);
  end loop;
end $$;

create policy calendar_events_read on public.calendar_events
  for select to authenticated
  using (private.can_read_calendar_event(id));
create policy calendar_events_insert on public.calendar_events
  for insert to authenticated
  with check (
    private.has_any_role(array['admin','operator']::public.app_role[])
    or private.manages_pole(pole_id)
  );
create policy calendar_events_update on public.calendar_events
  for update to authenticated
  using (
    private.has_any_role(array['admin','operator']::public.app_role[])
    or private.manages_pole(pole_id)
  )
  with check (
    private.has_any_role(array['admin','operator']::public.app_role[])
    or private.manages_pole(pole_id)
  );
create policy calendar_events_delete on public.calendar_events
  for delete to authenticated
  using (private.has_any_role(array['admin']::public.app_role[]));

create policy event_occurrences_read on public.event_occurrences
  for select to authenticated
  using (private.can_read_calendar_event(calendar_event_id));
create policy event_occurrences_write on public.event_occurrences
  for all to authenticated
  using (private.has_any_role(array['admin','operator']::public.app_role[]))
  with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy event_courts_read on public.event_courts
  for select to authenticated
  using (private.can_read_calendar_event(calendar_event_id));
create policy event_courts_write on public.event_courts
  for all to authenticated
  using (private.has_any_role(array['admin','operator']::public.app_role[]))
  with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy event_staff_read on public.event_staff_assignments
  for select to authenticated
  using (
    profile_id = (select auth.uid())
    or private.can_read_calendar_event(calendar_event_id)
  );
create policy event_staff_write on public.event_staff_assignments
  for all to authenticated
  using (private.has_any_role(array['admin','operator']::public.app_role[]))
  with check (private.has_any_role(array['admin','operator']::public.app_role[]));

create policy event_checklists_read on public.event_checklists
  for select to authenticated
  using (
    owner_profile_id = (select auth.uid())
    or private.can_read_calendar_event(calendar_event_id)
  );
create policy event_checklists_write on public.event_checklists
  for all to authenticated
  using (
    private.has_any_role(array['admin','operator']::public.app_role[])
    or owner_profile_id = (select auth.uid())
  )
  with check (
    private.has_any_role(array['admin','operator']::public.app_role[])
    or owner_profile_id = (select auth.uid())
  );

create policy calendar_q1_templates_read on public.calendar_q1_templates
  for select to authenticated
  using (
    active
    and (
      private.has_any_role(array['admin','operator']::public.app_role[])
      or private.manages_pole(pole_id)
    )
  );
create policy calendar_q1_templates_write on public.calendar_q1_templates
  for all to authenticated
  using (private.has_any_role(array['admin']::public.app_role[]))
  with check (private.has_any_role(array['admin']::public.app_role[]));

grant select, insert, update, delete on
  public.calendar_events,
  public.event_occurrences,
  public.event_courts,
  public.event_staff_assignments,
  public.event_checklists,
  public.calendar_q1_templates
to authenticated;

grant all on
  public.calendar_events,
  public.event_occurrences,
  public.event_courts,
  public.event_staff_assignments,
  public.event_checklists,
  public.calendar_q1_templates
to service_role;

insert into public.calendar_q1_templates (
  pole_id,
  name,
  weekday,
  starts_at,
  ends_at,
  event_type,
  competition_mode,
  target_courts,
  alternates_friday,
  notes
)
select p.id, template.name, template.weekday, template.starts_at::time, template.ends_at::time,
  template.event_type::public.calendar_event_type, template.competition_mode, template.target_courts,
  template.alternates_friday, template.notes
from public.poles p
join (
  values
    ('betim', 'Betim segunda 18h', 1, '18:00', '20:00', 'ur_play', 'scheduled_rounds', 1, false, 'Q1 base slot: Monday 18:00-20:00'),
    ('betim', 'Betim segunda 20h', 1, '20:00', '22:00', 'ur_play', 'scheduled_rounds', 1, false, 'Q1 base slot: Monday 20:00-22:00'),
    ('betim', 'Betim terça 18h', 2, '18:00', '20:00', 'ur_play', 'scheduled_rounds', 1, false, 'Q1 base slot: Tuesday 18:00-20:00'),
    ('betim', 'Betim terça 20h', 2, '20:00', '22:00', 'ur_play', 'scheduled_rounds', 1, false, 'Q1 base slot: Tuesday 20:00-22:00'),
    ('contagem', 'Contagem quarta 18h', 3, '18:00', '20:00', 'ur_play', 'scheduled_rounds', 1, false, 'Q1 base slot: Wednesday 18:00-20:00'),
    ('contagem', 'Contagem quarta 20h', 3, '20:00', '22:00', 'ur_play', 'scheduled_rounds', 1, false, 'Q1 base slot: Wednesday 20:00-22:00'),
    ('contagem', 'Contagem quinta 18h', 4, '18:00', '20:00', 'ur_play', 'scheduled_rounds', 1, false, 'Q1 base slot: Thursday 18:00-20:00'),
    ('contagem', 'Contagem quinta 20h', 4, '20:00', '22:00', 'ur_play', 'scheduled_rounds', 1, false, 'Q1 base slot: Thursday 20:00-22:00'),
    ('betim', 'Sexta alternada Betim 18h', 5, '18:00', '20:00', 'ur_play', 'scheduled_rounds', 1, true, 'Q1 alternating Friday slot'),
    ('betim', 'Sexta alternada Betim 20h', 5, '20:00', '22:00', 'ur_play', 'scheduled_rounds', 1, true, 'Q1 alternating Friday slot'),
    ('contagem', 'Sexta alternada Contagem 18h', 5, '18:00', '20:00', 'ur_play', 'scheduled_rounds', 1, true, 'Q1 alternating Friday slot'),
    ('contagem', 'Sexta alternada Contagem 20h', 5, '20:00', '22:00', 'ur_play', 'scheduled_rounds', 1, true, 'Q1 alternating Friday slot')
) as template(pole_key, name, weekday, starts_at, ends_at, event_type, competition_mode, target_courts, alternates_friday, notes)
  on lower(p.name) like '%' || template.pole_key || '%'
on conflict (pole_id, weekday, starts_at, ends_at, event_type) do nothing;
