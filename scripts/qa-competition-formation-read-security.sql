-- Ephemeral QA-only proof for competition formation read scopes.
-- Never run against DEV or PROD.

\set ON_ERROR_STOP on

insert into public.competition_formations (
  id,
  season_id,
  format_id,
  category_id,
  level,
  team_id,
  pole_id,
  display_name,
  member_signature,
  status
)
select
  '12000000-0000-4000-8000-000000000001'::uuid,
  '10000000-0000-4000-8000-000000000001'::uuid,
  f.id,
  c.id,
  'n2'::public.athlete_level,
  'c0000000-0000-4000-8000-000000000001'::uuid,
  '20000000-0000-4000-8000-000000000001'::uuid,
  '[QA] Team A Formation',
  'qa-team-a-formation-read-security',
  'active'::public.competition_formation_status
from public.competitive_formats f
join public.competitive_categories c on c.code = 'mixed'
where f.code = 'doubles'
on conflict (id) do update set
  team_id = excluded.team_id,
  pole_id = excluded.pole_id,
  status = excluded.status,
  updated_at = now();

insert into public.competition_formation_members (
  formation_id,
  athlete_id,
  position_order
)
values
  ('12000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 1),
  ('12000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003', 2)
on conflict (formation_id, athlete_id) do update set
  position_order = excluded.position_order;

do $$
declare
  target_table regclass;
begin
  foreach target_table in array array[
    'public.athlete_activation_wave_members'::regclass,
    'public.athlete_activation_waves'::regclass,
    'public.athlete_import_batches'::regclass,
    'public.athlete_import_rows'::regclass,
    'public.competition_formation_members'::regclass,
    'public.competition_formations'::regclass,
    'public.season_weeks'::regclass,
    'public.ur_play_session_preflight_checks'::regclass
  ] loop
    if not has_table_privilege('authenticated', target_table, 'select') then
      raise exception 'authenticated SELECT grant missing for %', target_table;
    end if;

    if has_table_privilege(
      'authenticated',
      target_table,
      'insert,update,delete'
    ) then
      raise exception 'authenticated write privilege detected for %', target_table;
    end if;
  end loop;

  if not exists (
    select 1
    from pg_class
    where oid = 'public.competition_formations'::regclass
      and relrowsecurity
      and relforcerowsecurity
  ) or not exists (
    select 1
    from pg_class
    where oid = 'public.competition_formation_members'::regclass
      and relrowsecurity
      and relforcerowsecurity
  ) then
    raise exception 'formation RLS is not enabled and forced';
  end if;
end;
$$;

begin;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
do $$
begin
  if (select count(*) from public.competition_formations) <> 1
    or (select count(*) from public.competition_formation_members) <> 2 then
    raise exception 'admin formation read scope failed';
  end if;
end;
$$;
rollback;

begin;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"a0000000-0000-4000-8000-000000000003","role":"authenticated"}',
  true
);
do $$
begin
  if (select count(*) from public.competition_formations) <> 1
    or (select count(*) from public.competition_formation_members) <> 2 then
    raise exception 'pole manager formation read scope failed';
  end if;
end;
$$;
rollback;

begin;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"a0000000-0000-4000-8000-000000000004","role":"authenticated"}',
  true
);
do $$
begin
  if (select count(*) from public.competition_formations) <> 1
    or (select count(*) from public.competition_formation_members) <> 2 then
    raise exception 'team manager formation read scope failed';
  end if;
end;
$$;
rollback;

begin;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"a0000000-0000-4000-8000-000000000005","role":"authenticated"}',
  true
);
do $$
begin
  if (select count(*) from public.competition_formations) <> 1
    or (select count(*) from public.competition_formation_members) <> 2 then
    raise exception 'current team athlete formation read scope failed';
  end if;
end;
$$;
rollback;

begin;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
do $$
begin
  if exists (select 1 from public.competition_formations)
    or exists (select 1 from public.competition_formation_members) then
    raise exception 'operator received unauthorized formation rows';
  end if;
end;
$$;
rollback;

begin;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"a0000000-0000-4000-8000-000000000006","role":"authenticated"}',
  true
);
do $$
begin
  if exists (select 1 from public.competition_formations)
    or exists (select 1 from public.competition_formation_members) then
    raise exception 'other-team athlete received unauthorized formation rows';
  end if;
end;
$$;
rollback;

select 'SCOPED_ADMIN_READ_SECURITY_PASS' as result;
