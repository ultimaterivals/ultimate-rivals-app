create or replace function private.confirm_ur_play_financial_scope(
  target_session uuid,
  target_notes text default null
)
returns public.ur_play_financial_closeouts
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_actor uuid := auth.uid();
  v_notes text := nullif(trim(coalesce(target_notes,'')),'');
  v_finance record;
  v_closeout public.ur_play_financial_closeouts%rowtype;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not private.operates_ur_play_session(target_session) then
    raise exception 'SESSION_OPERATION_DENIED' using errcode='42501';
  end if;
  if exists (
    select 1 from public.ur_play_post_session_closures c
    where c.session_id=target_session and c.status='closed'
  ) then
    raise exception 'POST_SESSION_ALREADY_CLOSED' using errcode='23514';
  end if;

  select * into v_finance from private.ur_play_finance_snapshot(target_session);
  if not v_finance.commercial_ready then
    raise exception 'UR_PLAY_FINANCE_NOT_RECONCILED' using errcode='23514';
  end if;

  insert into public.ur_play_financial_closeouts(
    session_id,status,confirmed_at,confirmed_by,notes,evidence_snapshot,
    reopened_at,reopened_by,reopen_reason,updated_at
  ) values(
    target_session,'confirmed',now(),v_actor,v_notes,to_jsonb(v_finance),
    null,null,null,now()
  )
  on conflict(session_id) do update
  set
    status='confirmed',
    confirmed_at=excluded.confirmed_at,
    confirmed_by=excluded.confirmed_by,
    notes=excluded.notes,
    evidence_snapshot=excluded.evidence_snapshot,
    reopened_at=null,
    reopened_by=null,
    reopen_reason=null,
    updated_at=now()
  returning * into v_closeout;

  perform private.refresh_ur_play_finance_task(target_session);

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(
    v_actor,
    'ur_play.finance_scope_confirmed',
    'ur_play_session',
    target_session,
    jsonb_build_object('status','confirmed','finance',to_jsonb(v_finance)),
    jsonb_build_object('notes',v_notes)
  );

  return v_closeout;
end;
$function$;

create or replace function private.reopen_ur_play_financial_scope(
  target_session uuid,
  target_reason text
)
returns public.ur_play_financial_closeouts
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_actor uuid := auth.uid();
  v_reason text := nullif(trim(coalesce(target_reason,'')),'');
  v_closeout public.ur_play_financial_closeouts%rowtype;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not private.has_any_role(array['admin']::public.app_role[]) then
    raise exception 'ADMIN_FINANCE_REOPEN_REQUIRED' using errcode='42501';
  end if;
  if not private.operates_ur_play_session(target_session) then
    raise exception 'SESSION_OPERATION_DENIED' using errcode='42501';
  end if;
  if exists (
    select 1 from public.ur_play_post_session_closures c
    where c.session_id=target_session and c.status='closed'
  ) then
    raise exception 'POST_SESSION_ALREADY_CLOSED' using errcode='23514';
  end if;
  if v_reason is null or char_length(v_reason)<10 then
    raise exception 'FINANCE_REOPEN_REASON_REQUIRED' using errcode='23514';
  end if;

  update public.ur_play_financial_closeouts
  set
    status='reopened',
    reopened_at=now(),
    reopened_by=v_actor,
    reopen_reason=v_reason,
    updated_at=now()
  where session_id=target_session and status='confirmed'
  returning * into v_closeout;
  if not found then raise exception 'FINANCE_SCOPE_NOT_CONFIRMED' using errcode='23514'; end if;

  perform private.refresh_ur_play_finance_task(target_session);

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(
    v_actor,'ur_play.finance_scope_reopened','ur_play_session',target_session,
    jsonb_build_object('status','reopened'),jsonb_build_object('reason',v_reason)
  );

  return v_closeout;
end;
$function$;
