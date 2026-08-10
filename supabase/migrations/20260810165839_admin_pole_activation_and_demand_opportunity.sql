create or replace function private.admin_activate_pole_stack(p_pole_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $$
declare
  v_actor uuid;
  v_venue_count integer;
  v_court_count integer;
  v_missing_courts integer;
begin
  v_actor := private.require_admin_actor();

  perform 1 from public.poles where id=p_pole_id for update;
  if not found then raise exception 'POLE_NOT_FOUND'; end if;

  select count(*)::integer into v_venue_count from public.venues where pole_id=p_pole_id;
  if v_venue_count < 1 then raise exception 'POLE_REQUIRES_VENUE'; end if;

  select count(*)::integer into v_missing_courts
  from public.venues v
  where v.pole_id=p_pole_id
    and not exists (select 1 from public.courts c where c.venue_id=v.id);
  if v_missing_courts > 0 then raise exception 'VENUE_REQUIRES_COURT'; end if;

  select count(*)::integer into v_court_count
  from public.courts c
  join public.venues v on v.id=c.venue_id
  where v.pole_id=p_pole_id;
  if v_court_count < 1 then raise exception 'POLE_REQUIRES_COURT'; end if;

  update public.venues set status='active' where pole_id=p_pole_id;
  update public.courts c
  set status='active'
  from public.venues v
  where c.venue_id=v.id and v.pole_id=p_pole_id;
  update public.poles set status='active' where id=p_pole_id;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(v_actor,'pole_stack.activated','pole',p_pole_id,jsonb_build_object('status','active','venues',v_venue_count,'courts',v_court_count),jsonb_build_object('source','admin_setup'));

  return p_pole_id;
end;
$$;

create or replace function private.admin_create_demand_opportunity(
  p_opportunity_type text,
  p_title text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_pole_id uuid,
  p_venue_id uuid default null,
  p_court_id uuid default null,
  p_level public.athlete_level default null,
  p_format_code text default null,
  p_category_code text default null,
  p_target_formations smallint default 4,
  p_max_formations smallint default 4,
  p_capacity_athletes smallint default 8,
  p_court_count smallint default 1,
  p_training_min_athletes smallint default null
)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $$
declare
  v_actor uuid;
  v_id uuid;
  v_title text := trim(p_title);
  v_pole public.poles%rowtype;
  v_venue public.venues%rowtype;
  v_court public.courts%rowtype;
begin
  v_actor := private.require_admin_actor();

  if p_opportunity_type not in ('ur_play','training') then raise exception 'INVALID_OPPORTUNITY_TYPE'; end if;
  if char_length(v_title) < 2 or char_length(v_title) > 140 then raise exception 'INVALID_OPPORTUNITY_TITLE'; end if;
  if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at then raise exception 'INVALID_OPPORTUNITY_PERIOD'; end if;
  if p_starts_at <= now() then raise exception 'OPPORTUNITY_MUST_BE_FUTURE'; end if;
  if p_format_code is not null and p_format_code not in ('doubles','fours') then raise exception 'INVALID_FORMAT_CODE'; end if;
  if p_category_code is not null and p_category_code not in ('female','male','mixed') then raise exception 'INVALID_CATEGORY_CODE'; end if;
  if p_target_formations < 1 or p_max_formations < p_target_formations then raise exception 'INVALID_FORMATION_TARGET'; end if;
  if p_capacity_athletes < 2 or p_capacity_athletes > 96 then raise exception 'INVALID_OPPORTUNITY_CAPACITY'; end if;
  if p_court_count < 1 or p_court_count > 8 then raise exception 'INVALID_COURT_COUNT'; end if;
  if p_training_min_athletes is not null and (p_training_min_athletes < 1 or p_training_min_athletes > p_capacity_athletes) then raise exception 'INVALID_TRAINING_MINIMUM'; end if;

  select * into v_pole from public.poles where id=p_pole_id for share;
  if not found then raise exception 'POLE_NOT_FOUND'; end if;
  if v_pole.status::text <> 'active' then raise exception 'POLE_NOT_ACTIVE'; end if;

  if p_venue_id is not null then
    select * into v_venue from public.venues where id=p_venue_id for share;
    if not found then raise exception 'VENUE_NOT_FOUND'; end if;
    if v_venue.pole_id <> p_pole_id then raise exception 'VENUE_POLE_MISMATCH'; end if;
    if v_venue.status::text <> 'active' then raise exception 'VENUE_NOT_ACTIVE'; end if;
  end if;

  if p_court_id is not null then
    if p_venue_id is null then raise exception 'COURT_REQUIRES_VENUE'; end if;
    select * into v_court from public.courts where id=p_court_id for share;
    if not found then raise exception 'COURT_NOT_FOUND'; end if;
    if v_court.venue_id <> p_venue_id then raise exception 'COURT_VENUE_MISMATCH'; end if;
    if v_court.status::text <> 'active' then raise exception 'COURT_NOT_ACTIVE'; end if;
  end if;

  insert into public.demand_opportunities(
    opportunity_type,status,title,starts_at,ends_at,pole_id,venue_id,court_id,
    level,format_code,category_code,modality,min_formations,target_formations,
    max_formations,capacity_athletes,court_count,training_min_athletes,created_by,metadata
  ) values (
    p_opportunity_type,'collecting_interest',v_title,p_starts_at,p_ends_at,p_pole_id,p_venue_id,p_court_id,
    p_level,p_format_code,p_category_code,'beach_volleyball',1,p_target_formations,
    p_max_formations,p_capacity_athletes,p_court_count,p_training_min_athletes,v_actor,
    jsonb_build_object('source','admin_command')
  ) returning id into v_id;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(v_actor,'demand_opportunity.created','demand_opportunity',v_id,jsonb_build_object('opportunity_type',p_opportunity_type,'status','collecting_interest','title',v_title,'starts_at',p_starts_at,'ends_at',p_ends_at,'pole_id',p_pole_id,'venue_id',p_venue_id,'court_id',p_court_id,'level',p_level,'format_code',p_format_code,'category_code',p_category_code,'capacity_athletes',p_capacity_athletes),jsonb_build_object('source','admin_command'));

  return v_id;
end;
$$;

create or replace function public.admin_activate_pole_stack(p_pole_id uuid)
returns uuid language sql set search_path to 'pg_catalog','public','private'
as $$ select private.admin_activate_pole_stack(p_pole_id); $$;

create or replace function public.admin_create_demand_opportunity(
  p_opportunity_type text,
  p_title text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_pole_id uuid,
  p_venue_id uuid default null,
  p_court_id uuid default null,
  p_level public.athlete_level default null,
  p_format_code text default null,
  p_category_code text default null,
  p_target_formations smallint default 4,
  p_max_formations smallint default 4,
  p_capacity_athletes smallint default 8,
  p_court_count smallint default 1,
  p_training_min_athletes smallint default null
)
returns uuid language sql set search_path to 'pg_catalog','public','private'
as $$ select private.admin_create_demand_opportunity(p_opportunity_type,p_title,p_starts_at,p_ends_at,p_pole_id,p_venue_id,p_court_id,p_level,p_format_code,p_category_code,p_target_formations,p_max_formations,p_capacity_athletes,p_court_count,p_training_min_athletes); $$;

revoke all on function public.admin_activate_pole_stack(uuid) from public,anon;
revoke all on function public.admin_create_demand_opportunity(text,text,timestamptz,timestamptz,uuid,uuid,uuid,public.athlete_level,text,text,smallint,smallint,smallint,smallint,smallint) from public,anon;
grant execute on function public.admin_activate_pole_stack(uuid) to authenticated;
grant execute on function public.admin_create_demand_opportunity(text,text,timestamptz,timestamptz,uuid,uuid,uuid,public.athlete_level,text,text,smallint,smallint,smallint,smallint,smallint) to authenticated;
