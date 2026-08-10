create or replace function private.require_admin_actor()
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null or not private.has_any_role(array['admin'::app_role]) then
    raise exception 'ADMIN_REQUIRED';
  end if;
  return v_actor;
end;
$$;

create or replace function private.admin_create_season(
  p_name text,
  p_code text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_registration_starts_at timestamptz default null,
  p_registration_ends_at timestamptz default null,
  p_ranking_cutoff_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $$
declare
  v_actor uuid;
  v_id uuid;
  v_name text := trim(p_name);
  v_code text := lower(trim(p_code));
begin
  v_actor := private.require_admin_actor();
  if char_length(v_name) < 2 then raise exception 'INVALID_SEASON_NAME'; end if;
  if v_code !~ '^[a-z0-9][a-z0-9-]{1,31}$' then raise exception 'INVALID_SEASON_CODE'; end if;
  if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at then raise exception 'INVALID_SEASON_PERIOD'; end if;
  if (p_registration_starts_at is null) <> (p_registration_ends_at is null) then raise exception 'INCOMPLETE_REGISTRATION_PERIOD'; end if;
  if p_registration_starts_at is not null and p_registration_ends_at <= p_registration_starts_at then raise exception 'INVALID_REGISTRATION_PERIOD'; end if;
  if p_ranking_cutoff_at is not null and (p_ranking_cutoff_at < p_starts_at or p_ranking_cutoff_at > p_ends_at) then raise exception 'INVALID_RANKING_CUTOFF'; end if;

  insert into public.seasons(name,code,starts_at,ends_at,ranking_cutoff_at,status,registration_starts_at,registration_ends_at)
  values(v_name,v_code,p_starts_at,p_ends_at,p_ranking_cutoff_at,'draft',p_registration_starts_at,p_registration_ends_at)
  returning id into v_id;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(v_actor,'season.created','season',v_id,jsonb_build_object('name',v_name,'code',v_code,'starts_at',p_starts_at,'ends_at',p_ends_at,'status','draft'),jsonb_build_object('source','admin_setup'));
  return v_id;
end;
$$;

create or replace function private.admin_create_season_cycle(
  p_season_id uuid,
  p_cycle_number smallint,
  p_name text,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $$
declare
  v_actor uuid;
  v_id uuid;
  v_season public.seasons%rowtype;
  v_name text := trim(p_name);
begin
  v_actor := private.require_admin_actor();
  select * into v_season from public.seasons where id=p_season_id for update;
  if not found then raise exception 'SEASON_NOT_FOUND'; end if;
  if p_cycle_number < 1 or p_cycle_number > 3 then raise exception 'INVALID_CYCLE_NUMBER'; end if;
  if char_length(v_name) < 2 then raise exception 'INVALID_CYCLE_NAME'; end if;
  if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at then raise exception 'INVALID_CYCLE_PERIOD'; end if;
  if p_starts_at < v_season.starts_at or p_ends_at > v_season.ends_at then raise exception 'CYCLE_OUTSIDE_SEASON'; end if;

  insert into public.season_cycles(season_id,cycle_number,name,starts_at,ends_at,status)
  values(p_season_id,p_cycle_number,v_name,p_starts_at,p_ends_at,'planned')
  returning id into v_id;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(v_actor,'season_cycle.created','season_cycle',v_id,jsonb_build_object('season_id',p_season_id,'cycle_number',p_cycle_number,'name',v_name,'starts_at',p_starts_at,'ends_at',p_ends_at,'status','planned'),jsonb_build_object('source','admin_setup'));
  return v_id;
end;
$$;

create or replace function private.admin_create_pole(
  p_name text,
  p_slug text,
  p_city text,
  p_state text
)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $$
declare
  v_actor uuid;
  v_id uuid;
  v_name text := trim(p_name);
  v_slug text := lower(trim(p_slug));
  v_city text := trim(p_city);
  v_state text := upper(trim(p_state));
begin
  v_actor := private.require_admin_actor();
  if char_length(v_name) < 2 then raise exception 'INVALID_POLE_NAME'; end if;
  if v_slug !~ '^[a-z0-9][a-z0-9-]{1,63}$' then raise exception 'INVALID_POLE_SLUG'; end if;
  if char_length(v_city) < 2 then raise exception 'INVALID_POLE_CITY'; end if;
  if v_state !~ '^[A-Z]{2}$' then raise exception 'INVALID_POLE_STATE'; end if;

  insert into public.poles(name,slug,city,state,status)
  values(v_name,v_slug,v_city,v_state,'draft')
  returning id into v_id;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(v_actor,'pole.created','pole',v_id,jsonb_build_object('name',v_name,'slug',v_slug,'city',v_city,'state',v_state,'status','draft'),jsonb_build_object('source','admin_setup'));
  return v_id;
end;
$$;

create or replace function private.admin_create_venue_with_court(
  p_pole_id uuid,
  p_venue_name text,
  p_address_line text default null,
  p_city text default null,
  p_state text default null,
  p_court_name text default 'Quadra 1'
)
returns table(venue_id uuid,court_id uuid)
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $$
declare
  v_actor uuid;
  v_pole public.poles%rowtype;
  v_venue_id uuid;
  v_court_id uuid;
  v_venue_name text := trim(p_venue_name);
  v_court_name text := trim(coalesce(p_court_name,'Quadra 1'));
  v_city text;
  v_state text;
begin
  v_actor := private.require_admin_actor();
  select * into v_pole from public.poles where id=p_pole_id for update;
  if not found then raise exception 'POLE_NOT_FOUND'; end if;
  if char_length(v_venue_name) < 2 then raise exception 'INVALID_VENUE_NAME'; end if;
  if char_length(v_court_name) < 2 then raise exception 'INVALID_COURT_NAME'; end if;
  v_city := coalesce(nullif(trim(p_city),''),v_pole.city);
  v_state := upper(coalesce(nullif(trim(p_state),''),trim(v_pole.state)));
  if v_state !~ '^[A-Z]{2}$' then raise exception 'INVALID_VENUE_STATE'; end if;

  insert into public.venues(name,pole_id,address_line,city,state,status)
  values(v_venue_name,p_pole_id,nullif(trim(p_address_line),''),v_city,v_state,'draft')
  returning id into v_venue_id;

  insert into public.courts(venue_id,name,sport_type,status)
  values(v_venue_id,v_court_name,'beach_volleyball','draft')
  returning id into v_court_id;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(v_actor,'venue.created','venue',v_venue_id,jsonb_build_object('name',v_venue_name,'pole_id',p_pole_id,'city',v_city,'state',v_state,'status','draft'),jsonb_build_object('source','admin_setup'));
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(v_actor,'court.created','court',v_court_id,jsonb_build_object('name',v_court_name,'venue_id',v_venue_id,'sport_type','beach_volleyball','status','draft'),jsonb_build_object('source','admin_setup'));

  return query select v_venue_id,v_court_id;
end;
$$;

create or replace function public.admin_create_season(
  p_name text,
  p_code text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_registration_starts_at timestamptz default null,
  p_registration_ends_at timestamptz default null,
  p_ranking_cutoff_at timestamptz default null
)
returns uuid language sql set search_path to 'pg_catalog','public','private'
as $$ select private.admin_create_season(p_name,p_code,p_starts_at,p_ends_at,p_registration_starts_at,p_registration_ends_at,p_ranking_cutoff_at); $$;

create or replace function public.admin_create_season_cycle(
  p_season_id uuid,
  p_cycle_number smallint,
  p_name text,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
returns uuid language sql set search_path to 'pg_catalog','public','private'
as $$ select private.admin_create_season_cycle(p_season_id,p_cycle_number,p_name,p_starts_at,p_ends_at); $$;

create or replace function public.admin_create_pole(p_name text,p_slug text,p_city text,p_state text)
returns uuid language sql set search_path to 'pg_catalog','public','private'
as $$ select private.admin_create_pole(p_name,p_slug,p_city,p_state); $$;

create or replace function public.admin_create_venue_with_court(
  p_pole_id uuid,
  p_venue_name text,
  p_address_line text default null,
  p_city text default null,
  p_state text default null,
  p_court_name text default 'Quadra 1'
)
returns table(venue_id uuid,court_id uuid) language sql set search_path to 'pg_catalog','public','private'
as $$ select * from private.admin_create_venue_with_court(p_pole_id,p_venue_name,p_address_line,p_city,p_state,p_court_name); $$;

revoke all on function public.admin_create_season(text,text,timestamptz,timestamptz,timestamptz,timestamptz,timestamptz) from public,anon;
revoke all on function public.admin_create_season_cycle(uuid,smallint,text,timestamptz,timestamptz) from public,anon;
revoke all on function public.admin_create_pole(text,text,text,text) from public,anon;
revoke all on function public.admin_create_venue_with_court(uuid,text,text,text,text,text) from public,anon;
grant execute on function public.admin_create_season(text,text,timestamptz,timestamptz,timestamptz,timestamptz,timestamptz) to authenticated;
grant execute on function public.admin_create_season_cycle(uuid,smallint,text,timestamptz,timestamptz) to authenticated;
grant execute on function public.admin_create_pole(text,text,text,text) to authenticated;
grant execute on function public.admin_create_venue_with_court(uuid,text,text,text,text,text) to authenticated;
