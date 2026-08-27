-- Fix PL/pgSQL variable/column ambiguity in canonical team roster guards.
-- This is a forward-only correction; composition semantics remain unchanged.

create or replace function private.enforce_roster_member_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_roster_id uuid := coalesce(new.roster_id, old.roster_id);
  v_format_code text;
  v_active_count integer;
  v_starters integer;
  v_reserves integer;
  v_params public.team_competition_parameters;
begin
  select f.code
    into v_format_code
  from public.team_rosters r
  join public.competitive_formats f on f.id = r.format_id
  where r.id = v_roster_id;

  if v_format_code is null then
    raise exception 'roster format not found' using errcode = '23503';
  end if;

  select p.*
    into v_params
  from public.team_competition_parameters p
  where p.format_code = v_format_code;

  if not found then
    raise exception 'team composition parameters missing for format %', v_format_code
      using errcode = '23514';
  end if;

  select
    count(*),
    count(*) filter (where m.role in ('starter', 'captain')),
    count(*) filter (where m.role = 'reserve')
  into v_active_count, v_starters, v_reserves
  from public.team_roster_members m
  where m.roster_id = v_roster_id
    and m.status = 'active';

  if v_active_count > v_params.required_starters + v_params.max_reserves
    or v_starters > v_params.required_starters
    or v_reserves > v_params.max_reserves then
    raise exception 'invalid % composition', v_format_code using errcode = '23514';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function private.validate_roster_activation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_format_code text;
  v_active_count integer;
  v_starters integer;
  v_reserves integer;
  v_params public.team_competition_parameters;
begin
  if new.status = 'active' and old.status is distinct from 'active' then
    select f.code
      into v_format_code
    from public.competitive_formats f
    where f.id = new.format_id;

    select p.*
      into v_params
    from public.team_competition_parameters p
    where p.format_code = v_format_code;

    if not found then
      raise exception 'team composition parameters missing for format %', v_format_code
        using errcode = '23514';
    end if;

    select
      count(*),
      count(*) filter (where m.role in ('starter', 'captain')),
      count(*) filter (where m.role = 'reserve')
    into v_active_count, v_starters, v_reserves
    from public.team_roster_members m
    where m.roster_id = new.id
      and m.status = 'active';

    if v_starters <> v_params.required_starters
      or v_reserves > v_params.max_reserves
      or v_active_count <> v_starters + v_reserves then
      raise exception 'invalid active % composition', v_format_code
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
