create or replace function private.set_activity_interest(
  p_opportunity_id uuid,
  p_active boolean default true,
  p_interest_mode text default 'self'
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_athlete_id uuid;
  v_interest_id uuid;
  v_show_identity boolean;
  v_opportunity public.demand_opportunities%rowtype;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  v_athlete_id := private.current_athlete_id();
  if v_athlete_id is null then
    raise exception 'ATHLETE_PROFILE_REQUIRED';
  end if;

  if p_interest_mode not in ('self','new_double','ready_formation') then
    raise exception 'INVALID_INTEREST_MODE';
  end if;

  select * into v_opportunity
  from public.demand_opportunities
  where id = p_opportunity_id
  for update;

  if not found then
    raise exception 'OPPORTUNITY_NOT_FOUND';
  end if;

  if p_active and v_opportunity.status not in ('collecting_interest','forming','almost_full','confirmed') then
    raise exception 'OPPORTUNITY_NOT_ACCEPTING_INTEREST';
  end if;

  if p_active and v_opportunity.starts_at is not null and v_opportunity.starts_at <= now() then
    raise exception 'OPPORTUNITY_ALREADY_STARTED';
  end if;

  select show_in_interest_lists into v_show_identity
  from public.athletes
  where id = v_athlete_id;

  insert into public.session_interests (
    opportunity_id,
    athlete_id,
    interest_mode,
    status,
    show_identity,
    source
  ) values (
    p_opportunity_id,
    v_athlete_id,
    p_interest_mode,
    case when p_active then 'active' else 'withdrawn' end,
    coalesce(v_show_identity, false),
    'athlete_portal'
  )
  on conflict (opportunity_id, athlete_id)
  do update set
    interest_mode = excluded.interest_mode,
    status = excluded.status,
    show_identity = excluded.show_identity,
    source = excluded.source,
    updated_at = now()
  returning id into v_interest_id;

  insert into public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    after_data,
    metadata
  ) values (
    auth.uid(),
    case when p_active then 'activity_interest.activated' else 'activity_interest.withdrawn' end,
    'session_interest',
    v_interest_id,
    jsonb_build_object('opportunity_id', p_opportunity_id, 'athlete_id', v_athlete_id, 'active', p_active, 'interest_mode', p_interest_mode),
    jsonb_build_object('source', 'athlete_portal')
  );

  return v_interest_id;
end;
$$;

revoke all on function private.set_activity_interest(uuid, boolean, text) from public, anon;
grant execute on function private.set_activity_interest(uuid, boolean, text) to authenticated;

create or replace function public.set_activity_interest(
  p_opportunity_id uuid,
  p_active boolean default true,
  p_interest_mode text default 'self'
)
returns uuid
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.set_activity_interest(p_opportunity_id, p_active, p_interest_mode);
$$;

revoke all on function public.set_activity_interest(uuid, boolean, text) from public, anon;
grant execute on function public.set_activity_interest(uuid, boolean, text) to authenticated;
