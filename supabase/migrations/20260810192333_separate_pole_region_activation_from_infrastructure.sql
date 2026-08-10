create or replace function private.admin_activate_pole_region(p_pole_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $$
declare
  v_actor uuid;
  v_pole public.poles%rowtype;
begin
  v_actor := private.require_admin_actor();
  select * into v_pole from public.poles where id=p_pole_id for update;
  if not found then raise exception 'POLE_NOT_FOUND'; end if;
  if v_pole.status='active'::entity_status then return v_pole.id; end if;
  if v_pole.status<>'draft'::entity_status then raise exception 'POLE_REGION_NOT_ACTIVATABLE'; end if;

  update public.poles set status='active'::entity_status where id=p_pole_id;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,before_data,after_data,metadata)
  values(
    v_actor,
    'pole_region.activated',
    'pole',
    p_pole_id,
    jsonb_build_object('status',v_pole.status,'name',v_pole.name,'city',v_pole.city),
    jsonb_build_object('status','active','name',v_pole.name,'city',v_pole.city),
    jsonb_build_object('source','admin_setup','infrastructure_activated',false)
  );

  return p_pole_id;
end;
$$;

create or replace function public.admin_activate_pole_region(p_pole_id uuid)
returns uuid
language sql
set search_path to 'pg_catalog','public','private'
as $$ select private.admin_activate_pole_region(p_pole_id); $$;

revoke all on function public.admin_activate_pole_region(uuid) from public,anon;
grant execute on function public.admin_activate_pole_region(uuid) to authenticated;
