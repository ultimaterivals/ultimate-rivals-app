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
  on conflict (season_id,cycle_number)
  do update set
    name=excluded.name,
    starts_at=excluded.starts_at,
    ends_at=excluded.ends_at,
    status='planned'
  returning id into v_id;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(v_actor,'season_cycle.configured','season_cycle',v_id,jsonb_build_object('season_id',p_season_id,'cycle_number',p_cycle_number,'name',v_name,'starts_at',p_starts_at,'ends_at',p_ends_at,'status','planned'),jsonb_build_object('source','admin_setup'));
  return v_id;
end;
$$;

create or replace function public.admin_create_season_cycle(
  p_season_id uuid,
  p_cycle_number smallint,
  p_name text,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
returns uuid language sql set search_path to 'pg_catalog','public','private'
as $$ select private.admin_create_season_cycle(p_season_id,p_cycle_number,p_name,p_starts_at,p_ends_at); $$;

revoke all on function public.admin_create_season_cycle(uuid,smallint,text,timestamptz,timestamptz) from public,anon;
grant execute on function public.admin_create_season_cycle(uuid,smallint,text,timestamptz,timestamptz) to authenticated;
