create or replace function private.update_ur_play_report_action_status(
  target_action uuid,
  target_status text,
  target_reason text default null
)
returns public.ur_play_report_actions
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_actor uuid := auth.uid();
  v_action public.ur_play_report_actions%rowtype;
  v_before jsonb;
  v_reason text := nullif(trim(coalesce(target_reason,'')),'');
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if target_status not in ('completed','waived') then
    raise exception 'INVALID_REPORT_ACTION_STATUS' using errcode='23514';
  end if;
  if target_status='waived' and not private.has_any_role(array['admin']::public.app_role[]) then
    raise exception 'ADMIN_REPORT_ACTION_WAIVER_REQUIRED' using errcode='42501';
  end if;

  select * into v_action
  from public.ur_play_report_actions
  where id=target_action
  for update;
  if not found then raise exception 'REPORT_ACTION_NOT_FOUND'; end if;
  if not private.operates_ur_play_session(v_action.session_id) then
    raise exception 'SESSION_OPERATION_DENIED' using errcode='42501';
  end if;
  if v_action.status in ('completed','waived') then return v_action; end if;
  if target_status='waived' and (v_reason is null or char_length(v_reason)<10) then
    raise exception 'REPORT_ACTION_WAIVER_REASON_REQUIRED' using errcode='23514';
  end if;

  v_before := to_jsonb(v_action);
  update public.ur_play_report_actions
  set
    status=target_status,
    completed_at=case when target_status='completed' then now() else null end,
    completed_by=case when target_status='completed' then v_actor else null end,
    waived_at=case when target_status='waived' then now() else null end,
    waived_by=case when target_status='waived' then v_actor else null end,
    waiver_reason=case when target_status='waived' then v_reason else null end,
    updated_at=now()
  where id=target_action
  returning * into v_action;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,before_data,after_data,metadata)
  values(
    v_actor,'ur_play.report.action_resolved','ur_play_report_action',v_action.id,
    v_before,to_jsonb(v_action),jsonb_build_object('session_id',v_action.session_id,'status',target_status)
  );

  return v_action;
end;
$function$;

revoke all on function private.update_ur_play_report_action_status(uuid,text,text)
  from public, anon;
grant execute on function private.update_ur_play_report_action_status(uuid,text,text)
  to authenticated, service_role;


