-- Opt-in is only an expression of interest. Enrollment and published plans
-- remain separate, staff-managed Hunter records.
create table public.athlete_hunter_interests (
  athlete_id uuid primary key references public.athletes(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table public.athlete_hunter_interests enable row level security;
revoke all on public.athlete_hunter_interests from public, anon, authenticated;

create policy athlete_hunter_interests_read on public.athlete_hunter_interests
  for select to authenticated
  using (
    athlete_id = (select private.current_athlete_id())
    or (select private.has_any_role(array['admin', 'operator']::public.app_role[]))
  );

create policy athlete_hunter_interests_insert on public.athlete_hunter_interests
  for insert to authenticated
  with check (athlete_id = (select private.current_athlete_id()));

grant select on public.athlete_hunter_interests to authenticated;
grant insert (athlete_id) on public.athlete_hunter_interests to authenticated;
grant all on public.athlete_hunter_interests to service_role;
