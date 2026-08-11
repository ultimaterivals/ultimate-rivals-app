create or replace function private.admin_confirm_ur_play_opportunity(
  p_opportunity_id uuid,
  p_season_id uuid,
  p_cycle_id uuid,
  p_court_id uuid,
  p_registration_closes_at timestamptz,
  p_price_amount numeric default 0,
  p_price_label text default null,
  p_cancel_without_charge_hours integer default 12,
  p_override_reason text default null
)
returns table(calendar_event_id uuid, session_id uuid, opportunity_status text)
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_actor uuid;
  v_opportunity public.demand_opportunities%rowtype;
  v_season public.seasons%rowtype;
  v_cycle public.season_cycles%rowtype;
  v_venue public.venues%rowtype;
  v_court public.courts%rowtype;
  v_format_id uuid;
  v_category_id uuid;
  v_event_id uuid;
  v_session_id uuid;
  v_interested integer;
  v_ready_formations integer;
  v_formation_size integer;
  v_min_athletes integer;
  v_ready boolean;
  v_override text := nullif(trim(coalesce(p_override_reason,'')),'');
  v_price_label text := nullif(trim(coalesce(p_price_label,'')),'');
begin
  v_actor := private.require_admin_actor();

  select * into v_opportunity
  from public.demand_opportunities
  where id=p_opportunity_id
  for update;
  if not found then raise exception 'OPPORTUNITY_NOT_FOUND'; end if;
  if v_opportunity.opportunity_type <> 'ur_play' then raise exception 'OPPORTUNITY_NOT_UR_PLAY'; end if;
  if v_opportunity.status not in ('collecting_interest','forming','almost_full') then raise exception 'OPPORTUNITY_NOT_CONFIRMABLE'; end if;
  if v_opportunity.ur_play_session_id is not null or v_opportunity.calendar_event_id is not null then raise exception 'OPPORTUNITY_ALREADY_LINKED'; end if;
  if v_opportunity.starts_at is null or v_opportunity.ends_at is null or v_opportunity.ends_at <= v_opportunity.starts_at or v_opportunity.starts_at <= now() then raise exception 'INVALID_OPPORTUNITY_PERIOD'; end if;
  if v_opportunity.pole_id is null then raise exception 'UR_PLAY_REQUIRES_POLE'; end if;
  if v_opportunity.format_code not in ('doubles','fours') then raise exception 'UR_PLAY_REQUIRES_FORMAT'; end if;
  if p_registration_closes_at is null or p_registration_closes_at <= now() or p_registration_closes_at > v_opportunity.starts_at then raise exception 'INVALID_REGISTRATION_CLOSE'; end if;
  if coalesce(p_price_amount,0) < 0 then raise exception 'INVALID_PRICE_AMOUNT'; end if;
  if p_cancel_without_charge_hours < 0 or p_cancel_without_charge_hours > 168 then raise exception 'INVALID_CANCELLATION_WINDOW'; end if;

  select * into v_season
  from public.seasons
  where id=p_season_id
  for share;
  if not found then raise exception 'SEASON_NOT_FOUND'; end if;
  if v_season.status not in ('registration','active') then raise exception 'SEASON_NOT_READY'; end if;
  if v_opportunity.starts_at < v_season.starts_at or v_opportunity.ends_at > v_season.ends_at then raise exception 'OPPORTUNITY_OUTSIDE_SEASON'; end if;

  select * into v_cycle
  from public.season_cycles
  where id=p_cycle_id and season_id=p_season_id
  for share;
  if not found then raise exception 'SEASON_CYCLE_NOT_FOUND'; end if;
  if v_cycle.status not in ('planned','active') then raise exception 'SEASON_CYCLE_NOT_READY'; end if;
  if v_opportunity.starts_at < v_cycle.starts_at or v_opportunity.ends_at > v_cycle.ends_at then raise exception 'OPPORTUNITY_OUTSIDE_CYCLE'; end if;

  select * into v_court
  from public.courts
  where id=p_court_id
  for share;
  if not found or v_court.status::text <> 'active' then raise exception 'COURT_NOT_READY'; end if;

  select * into v_venue
  from public.venues
  where id=v_court.venue_id
  for share;
  if not found or v_venue.status::text <> 'active' or v_venue.pole_id <> v_opportunity.pole_id then raise exception 'VENUE_NOT_READY'; end if;
  if v_opportunity.venue_id is not null and v_opportunity.venue_id <> v_venue.id then raise exception 'COURT_VENUE_MISMATCH'; end if;

  select id into v_format_id
  from public.competitive_formats
  where code=v_opportunity.format_code and status='active';
  if v_format_id is null then raise exception 'FORMAT_NOT_FOUND'; end if;

  if v_opportunity.category_code is not null then
    select id into v_category_id
    from public.competitive_categories
    where code=v_opportunity.category_code and status='active';
    if v_category_id is null then raise exception 'CATEGORY_NOT_FOUND'; end if;
  end if;

  select count(*)::integer into v_interested
  from public.session_interests
  where opportunity_id=p_opportunity_id and status='active';

  select count(*)::integer into v_ready_formations
  from public.demand_formations
  where opportunity_id=p_opportunity_id and status='ready';

  v_formation_size := case v_opportunity.format_code when 'fours' then 4 else 2 end;
  v_min_athletes := greatest(1,v_opportunity.min_formations::integer) * v_formation_size;
  v_ready := v_ready_formations >= v_opportunity.min_formations or v_interested >= v_min_athletes;
  if not v_ready and (v_override is null or char_length(v_override) < 10) then raise exception 'DEMAND_NOT_READY'; end if;

  insert into public.calendar_events(
    name,event_type,starts_at,ends_at,pole_id,venue_id,status,notes,created_by,season_id
  ) values(
    v_opportunity.title,
    'ur_play',
    v_opportunity.starts_at,
    v_opportunity.ends_at,
    v_opportunity.pole_id,
    v_venue.id,
    'registration_open',
    case when v_override is null then null else 'Confirmação com override administrativo: '||v_override end,
    v_actor,
    p_season_id
  ) returning id into v_event_id;

  insert into public.ur_play_sessions(
    season_id,
    season_cycle_id,
    calendar_event_id,
    pole_id,
    venue_id,
    name,
    session_date,
    status,
    starts_at,
    ends_at,
    registration_opens_at,
    registration_closes_at,
    price_amount,
    capacity,
    waitlist_capacity,
    created_by
  ) values(
    p_season_id,
    p_cycle_id,
    v_event_id,
    v_opportunity.pole_id,
    v_venue.id,
    v_opportunity.title,
    (v_opportunity.starts_at at time zone 'America/Sao_Paulo')::date,
    'draft',
    v_opportunity.starts_at,
    v_opportunity.ends_at,
    now(),
    p_registration_closes_at,
    coalesce(p_price_amount,0),
    v_opportunity.capacity_athletes,
    0,
    v_actor
  ) returning id into v_session_id;

  insert into public.ur_play_session_scopes(session_id,format_id,category_id,level)
  values(v_session_id,v_format_id,v_category_id,v_opportunity.level);

  insert into public.ur_play_session_courts(session_id,court_id,position)
  values(v_session_id,p_court_id,1);

  perform private.transition_ur_play_session(v_session_id,'published');
  perform private.transition_ur_play_session(v_session_id,'registration_open');

  update public.demand_opportunities
  set
    status='confirmed',
    venue_id=v_venue.id,
    calendar_event_id=v_event_id,
    ur_play_session_id=v_session_id,
    court_id=p_court_id,
    metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object(
      'cancel_without_charge_hours',p_cancel_without_charge_hours,
      'late_cancel_consumes_credit',true,
      'confirmed_by',v_actor,
      'demand_override_reason',v_override,
      'price_label',v_price_label,
      'price_amount',coalesce(p_price_amount,0)
    ),
    updated_at=now()
  where id=p_opportunity_id;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(
    v_actor,
    'demand_opportunity.confirmed_as_ur_play',
    'demand_opportunity',
    p_opportunity_id,
    jsonb_build_object(
      'calendar_event_id',v_event_id,
      'session_id',v_session_id,
      'status','confirmed',
      'venue_id',v_venue.id,
      'court_id',p_court_id,
      'interested_count',v_interested,
      'ready_formations',v_ready_formations,
      'demand_ready',v_ready
    ),
    jsonb_build_object(
      'source','admin_command',
      'override_reason',v_override,
      'price_label',v_price_label,
      'cancel_without_charge_hours',p_cancel_without_charge_hours
    )
  );

  return query select v_event_id,v_session_id,'confirmed'::text;
end;
$function$;

revoke all on function private.admin_confirm_ur_play_opportunity(uuid,uuid,uuid,uuid,timestamptz,numeric,text,integer,text)
  from public, anon;
grant execute on function private.admin_confirm_ur_play_opportunity(uuid,uuid,uuid,uuid,timestamptz,numeric,text,integer,text)
  to authenticated, service_role;
