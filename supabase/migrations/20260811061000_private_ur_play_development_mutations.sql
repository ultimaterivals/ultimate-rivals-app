-- C39 security hardening: keep privileged writes outside the exposed public schema.
-- Public RPCs remain SECURITY INVOKER wrappers; private SECURITY DEFINER functions
-- enforce auth, role, session access and 360-close gates before mutating protected data.

create or replace function private.refresh_ur_play_development_cases(target_session uuid)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not private.operates_ur_play_session(target_session) then raise exception 'SESSION_OPERATION_DENIED' using errcode='42501'; end if;
  if exists(select 1 from public.ur_play_post_session_closures c where c.session_id=target_session and c.status='closed') then
    raise exception 'POST_SESSION_ALREADY_CLOSED' using errcode='23514';
  end if;
  perform private.refresh_ur_play_development_evidence(target_session);
end;
$function$;

create or replace function private.resolve_ur_play_development_case(
  target_case uuid,
  target_action text,
  target_notes text default null
)
returns public.ur_play_development_cases
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_actor uuid := auth.uid();
  v_case public.ur_play_development_cases%rowtype;
  v_process public.athlete_leveling_processes%rowtype;
  v_notes text := nullif(trim(coalesce(target_notes,'')),'');
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if target_action not in ('continue_observation','start_leveling_process','queue_level_review','development_followup_recorded','no_change_required','other') then
    raise exception 'INVALID_DEVELOPMENT_ACTION' using errcode='23514';
  end if;
  if target_action='other' and coalesce(char_length(v_notes),0)<10 then
    raise exception 'DEVELOPMENT_NOTES_REQUIRED' using errcode='23514';
  end if;

  select * into v_case from public.ur_play_development_cases where id=target_case for update;
  if not found then raise exception 'DEVELOPMENT_CASE_NOT_FOUND'; end if;
  if not private.operates_ur_play_session(v_case.session_id) then raise exception 'SESSION_OPERATION_DENIED' using errcode='42501'; end if;
  if exists(select 1 from public.ur_play_post_session_closures c where c.session_id=v_case.session_id and c.status='closed') then
    raise exception 'POST_SESSION_ALREADY_CLOSED' using errcode='23514';
  end if;
  if v_case.status in ('resolved','waived') then return v_case; end if;

  if target_action='start_leveling_process' then
    select * into v_process
    from public.athlete_leveling_processes p
    where p.athlete_id=v_case.athlete_id and p.season_id=v_case.season_id
      and p.status not in ('completed','cancelled')
    order by p.created_at desc limit 1;

    if v_process.id is null then
      insert into public.athlete_leveling_processes(athlete_id,season_id)
      values(v_case.athlete_id,v_case.season_id)
      returning * into v_process;
    end if;

    if not exists(
      select 1 from public.athlete_levels al
      where al.athlete_id=v_case.athlete_id and al.season_id=v_case.season_id and al.status='active'
    ) then
      insert into public.athlete_levels(athlete_id,season_id,level,starts_at,reason,assigned_by)
      values(v_case.athlete_id,v_case.season_id,'leveling',now(),'Entrada em nivelamento iniciada no Pós-Sessão UR Play',v_actor);
    end if;

    update public.ur_play_development_cases
    set leveling_process_id=v_process.id,current_level=coalesce(current_level,'leveling'::public.athlete_level),updated_at=now()
    where id=v_case.id;
  end if;

  update public.ur_play_development_cases
  set status='resolved',resolution_action=target_action,resolution_notes=v_notes,
      resolved_at=now(),resolved_by=v_actor,updated_at=now()
  where id=v_case.id returning * into v_case;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(
    v_actor,'ur_play.development.case_resolved','ur_play_development_case',v_case.id,
    jsonb_build_object('status',v_case.status,'resolution_action',target_action,'session_id',v_case.session_id,'athlete_id',v_case.athlete_id),
    jsonb_build_object('notes',v_notes)
  );

  perform private.refresh_ur_play_development_evidence(v_case.session_id);
  select * into v_case from public.ur_play_development_cases where id=target_case;
  return v_case;
end;
$function$;

create or replace function private.waive_ur_play_development_case(target_case uuid,target_reason text)
returns public.ur_play_development_cases
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_actor uuid := auth.uid();
  v_case public.ur_play_development_cases%rowtype;
  v_reason text := nullif(trim(coalesce(target_reason,'')),'');
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not private.has_any_role(array['admin']::public.app_role[]) then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
  if v_reason is null or char_length(v_reason)<10 then raise exception 'DEVELOPMENT_WAIVER_REASON_REQUIRED' using errcode='23514'; end if;

  select * into v_case from public.ur_play_development_cases where id=target_case for update;
  if not found then raise exception 'DEVELOPMENT_CASE_NOT_FOUND'; end if;
  if not private.operates_ur_play_session(v_case.session_id) then raise exception 'SESSION_OPERATION_DENIED' using errcode='42501'; end if;
  if exists(select 1 from public.ur_play_post_session_closures c where c.session_id=v_case.session_id and c.status='closed') then
    raise exception 'POST_SESSION_ALREADY_CLOSED' using errcode='23514';
  end if;

  update public.ur_play_development_cases
  set status='waived',waived_at=now(),waived_by=v_actor,waiver_reason=v_reason,updated_at=now()
  where id=v_case.id returning * into v_case;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(
    v_actor,'ur_play.development.case_waived','ur_play_development_case',v_case.id,
    jsonb_build_object('status','waived','session_id',v_case.session_id,'athlete_id',v_case.athlete_id),
    jsonb_build_object('reason',v_reason)
  );

  perform private.refresh_ur_play_development_evidence(v_case.session_id);
  return v_case;
end;
$function$;

create or replace function private.reopen_ur_play_development_case(target_case uuid,target_reason text)
returns public.ur_play_development_cases
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_actor uuid := auth.uid();
  v_case public.ur_play_development_cases%rowtype;
  v_reason text := nullif(trim(coalesce(target_reason,'')),'');
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not private.has_any_role(array['admin']::public.app_role[]) then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
  if v_reason is null or char_length(v_reason)<10 then raise exception 'DEVELOPMENT_REOPEN_REASON_REQUIRED' using errcode='23514'; end if;

  select * into v_case from public.ur_play_development_cases where id=target_case for update;
  if not found then raise exception 'DEVELOPMENT_CASE_NOT_FOUND'; end if;
  if not private.operates_ur_play_session(v_case.session_id) then raise exception 'SESSION_OPERATION_DENIED' using errcode='42501'; end if;
  if exists(select 1 from public.ur_play_post_session_closures c where c.session_id=v_case.session_id and c.status='closed') then
    raise exception 'POST_SESSION_ALREADY_CLOSED' using errcode='23514';
  end if;

  update public.ur_play_development_cases
  set status='pending',resolution_action=null,resolution_notes=null,resolved_at=null,resolved_by=null,
      waived_at=null,waived_by=null,waiver_reason=null,updated_at=now()
  where id=v_case.id returning * into v_case;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(
    v_actor,'ur_play.development.case_reopened','ur_play_development_case',v_case.id,
    jsonb_build_object('status','pending','session_id',v_case.session_id,'athlete_id',v_case.athlete_id),
    jsonb_build_object('reason',v_reason)
  );

  perform private.refresh_ur_play_development_evidence(v_case.session_id);
  return v_case;
end;
$function$;

revoke all on function private.refresh_ur_play_development_cases(uuid) from public,anon;
revoke all on function private.resolve_ur_play_development_case(uuid,text,text) from public,anon;
revoke all on function private.waive_ur_play_development_case(uuid,text) from public,anon;
revoke all on function private.reopen_ur_play_development_case(uuid,text) from public,anon;

grant execute on function private.refresh_ur_play_development_cases(uuid) to authenticated,service_role;
grant execute on function private.resolve_ur_play_development_case(uuid,text,text) to authenticated,service_role;
grant execute on function private.waive_ur_play_development_case(uuid,text) to authenticated,service_role;
grant execute on function private.reopen_ur_play_development_case(uuid,text) to authenticated,service_role;

create or replace function public.refresh_ur_play_development_cases(target_session uuid)
returns void
language sql
security invoker
set search_path to ''
as $function$
  select private.refresh_ur_play_development_cases(target_session);
$function$;

create or replace function public.resolve_ur_play_development_case(target_case uuid,target_action text,target_notes text default null)
returns public.ur_play_development_cases
language sql
security invoker
set search_path to ''
as $function$
  select private.resolve_ur_play_development_case(target_case,target_action,target_notes);
$function$;

create or replace function public.waive_ur_play_development_case(target_case uuid,target_reason text)
returns public.ur_play_development_cases
language sql
security invoker
set search_path to ''
as $function$
  select private.waive_ur_play_development_case(target_case,target_reason);
$function$;

create or replace function public.reopen_ur_play_development_case(target_case uuid,target_reason text)
returns public.ur_play_development_cases
language sql
security invoker
set search_path to ''
as $function$
  select private.reopen_ur_play_development_case(target_case,target_reason);
$function$;

revoke all on function public.refresh_ur_play_development_cases(uuid) from public,anon;
revoke all on function public.resolve_ur_play_development_case(uuid,text,text) from public,anon;
revoke all on function public.waive_ur_play_development_case(uuid,text) from public,anon;
revoke all on function public.reopen_ur_play_development_case(uuid,text) from public,anon;

grant execute on function public.refresh_ur_play_development_cases(uuid) to authenticated,service_role;
grant execute on function public.resolve_ur_play_development_case(uuid,text,text) to authenticated,service_role;
grant execute on function public.waive_ur_play_development_case(uuid,text) to authenticated,service_role;
grant execute on function public.reopen_ur_play_development_case(uuid,text) to authenticated,service_role;