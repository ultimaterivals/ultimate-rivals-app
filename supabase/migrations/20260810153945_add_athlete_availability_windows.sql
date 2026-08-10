create table public.athlete_availability_windows (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  starts_at time without time zone not null,
  ends_at time without time zone not null,
  pole_id uuid references public.poles(id) on delete set null,
  modality text not null,
  format_codes text[] not null default '{}',
  category_codes text[] not null default '{}',
  valid_from date not null default current_date,
  valid_until date,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint athlete_availability_windows_time_order check (starts_at < ends_at),
  constraint athlete_availability_windows_validity check (valid_until is null or valid_until >= valid_from),
  constraint athlete_availability_windows_exact_window_unique unique (athlete_id, day_of_week, starts_at, ends_at, pole_id, modality, valid_from)
);

create index athlete_availability_windows_athlete_active_idx
  on public.athlete_availability_windows (athlete_id, active, day_of_week);
create index athlete_availability_windows_demand_idx
  on public.athlete_availability_windows (day_of_week, starts_at, ends_at, pole_id)
  where active = true;

create trigger set_athlete_availability_windows_updated_at
before update on public.athlete_availability_windows
for each row execute function private.set_updated_at();

alter table public.athlete_availability_windows enable row level security;

revoke all on public.athlete_availability_windows from anon;
grant select, insert, update, delete on public.athlete_availability_windows to authenticated;

create policy athlete_availability_windows_select
  on public.athlete_availability_windows
  for select
  to authenticated
  using (private.can_access_athlete(athlete_id));

create policy athlete_availability_windows_insert_own
  on public.athlete_availability_windows
  for insert
  to authenticated
  with check (athlete_id = private.current_athlete_id());

create policy athlete_availability_windows_update_own
  on public.athlete_availability_windows
  for update
  to authenticated
  using (athlete_id = private.current_athlete_id())
  with check (athlete_id = private.current_athlete_id());

create policy athlete_availability_windows_delete_own
  on public.athlete_availability_windows
  for delete
  to authenticated
  using (athlete_id = private.current_athlete_id());
