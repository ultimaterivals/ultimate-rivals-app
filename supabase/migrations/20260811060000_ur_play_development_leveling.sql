create table if not exists public.ur_play_development_cases (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ur_play_sessions(id) on delete cascade,
  registration_id uuid not null references public.ur_play_registrations(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete restrict,
  leveling_process_id uuid references public.athlete_leveling_processes(id) on delete set null,
  current_level public.athlete_level,
  reasons jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  recommended_action text,
  resolution_action text,
  resolution_notes text,
  due_at timestamptz not null,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id),
  waived_at timestamptz,
  waived_by uuid references public.profiles(id),
  waiver_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ur_play_development_cases_registration_unique unique(registration_id),
  constraint ur_play_development_cases_status_check check (status in ('pending','in_progress','resolved','waived')),
  constraint ur_play_development_cases_reasons_array_check check (jsonb_typeof(reasons)='array'),
  constraint ur_play_development_cases_waiver_check check (
    status <> 'waived' or (
      waived_at is not null and waived_by is not null and char_length(trim(coalesce(waiver_reason,''))) >= 10
    )
  )
);

create index if not exists ur_play_development_cases_session_idx
  on public.ur_play_development_cases(session_id,status,due_at);
create index if not exists ur_play_development_cases_athlete_idx
  on public.ur_play_development_cases(athlete_id,status,created_at);

alter table public.ur_play_development_cases enable row level security;
revoke all on table public.ur_play_development_cases from public,anon;
grant select on table public.ur_play_development_cases to authenticated,service_role;

create policy ur_play_development_cases_read
on public.ur_play_development_cases
for select
to authenticated
using (private.operates_ur_play_session(session_id));

create or replace function private.refresh_ur_play_development_evidence(target_session uuid)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_session public.ur_play_sessions%rowtype;
  v_registration public.ur_play_registrations%rowtype;
  v_level public.athlete_level;
  v_process public.athlete_leveling_processes%rowtype;
  v_pending_reviews integer;
  v_due_plans integer;
  v_reasons jsonb;
  v_recommendation text;
  v_case public.ur_play_development_cases%rowtype;
  v_total integer := 0;
  v_pending integer := 0;
  v_in_progress integer := 0;
  v_resolved integer := 0;
  v_waived integer := 0;
  v_missing_level integer := 0;
  v_observation integer := 0;
  v_ready_review integer := 0;
  v_level_review integer := 0;
  v_plan_due integer := 0;
begin
  select * into v_session from public.ur_play_sessions where id=target_session;
  if not found then raise exception 'UR_PLAY_SESSION_NOT_FOUND'; end if;
  if v_session.status <> 'completed' then return; end if;

  perform private.ensure_ur_play_post_session_tasks(target_session);

  for v_registration in
    select r.*
    from public.ur_play_registrations r
    where r.session_id=target_session
      and r.registration_status='confirmed'
      and r.attendance_status in ('checked_in','present')
  loop
    v_level := null;
    v_process := null;
    v_pending_reviews := 0;
    v_due_plans := 0;
    v_reasons := '[]'::jsonb;
    v_recommendation := null;

    select al.level into v_level
    from public.athlete_levels al
    where al.athlete_id=v_registration.athlete_id
      and al.season_id=v_session.season_id
      and al.status='active'
    order by al.starts_at desc
    limit 1;

    select p.* into v_process
    from public.athlete_leveling_processes p
    where p.athlete_id=v_registration.athlete_id
      and p.season_id=v_session.season_id
      and p.status not in ('completed','cancelled')
    order by p.created_at desc
    limit 1;

    select count(*)::integer into v_pending_reviews
    from public.level_change_reviews r
    where r.athlete_id=v_registration.athlete_id
      and r.season_id=v_session.season_id
      and r.status='pending';

    select count(*)::integer into v_due_plans
    from public.athlete_development_plans d
    where d.athlete_id=v_registration.athlete_id
      and (d.season_id is null or d.season_id=v_session.season_id)
      and (
        d.status='review_due'
        or (d.status='active' and d.review_at is not null and d.review_at <= v_session.ends_at)
      );

    if v_level is null then
      v_reasons := v_reasons || jsonb_build_array('missing_active_level');
      v_recommendation := 'start_leveling_process';
    elsif v_level='leveling' and v_process.id is null then
      v_reasons := v_reasons || jsonb_build_array('leveling_process_missing');
      v_recommendation := 'start_leveling_process';
    end if;

    if v_process.id is not null and v_process.status in ('pending','in_progress') then
      v_reasons := v_reasons || jsonb_build_array('observations_incomplete');
      if v_recommendation is null then v_recommendation := 'continue_observation'; end if;
    elsif v_process.id is not null and v_process.status='ready_for_review' then
      v_reasons := v_reasons || jsonb_build_array('leveling_ready_for_review');
      if v_recommendation is null then v_recommendation := 'queue_level_review'; end if;
    end if;

    if v_pending_reviews > 0 then
      v_reasons := v_reasons || jsonb_build_array('level_change_review_pending');
      if v_recommendation is null then v_recommendation := 'queue_level_review'; end if;
    end if;

    if v_due_plans > 0 then
      v_reasons := v_reasons || jsonb_build_array('development_plan_review_due');
      if v_recommendation is null then v_recommendation := 'development_followup_recorded'; end if;
    end if;

    if jsonb_array_length(v_reasons)>0 then
      insert into public.ur_play_development_cases(
        session_id,registration_id,athlete_id,season_id,leveling_process_id,current_level,
        reasons,evidence,status,recommended_action,due_at
      ) values (
        target_session,v_registration.id,v_registration.athlete_id,v_session.season_id,v_process.id,v_level,
        v_reasons,
        jsonb_build_object(
          'process_status',case when v_process.id is null then null else v_process.status::text end,
          'required_observations',case when v_process.id is null then null else v_process.required_observations end,
          'completed_observations',case when v_process.id is null then null else v_process.completed_observations end,
          'pending_level_reviews',v_pending_reviews,
          'development_plans_due',v_due_plans,
          'verified_at',now()
        ),
        'pending',v_recommendation,v_session.ends_at+interval '24 hours'
      )
      on conflict(registration_id) do update set
        leveling_process_id=excluded.leveling_process_id,
        current_level=excluded.current_level,
        reasons=excluded.reasons,
        evidence=excluded.evidence,
        recommended_action=excluded.recommended_action,
        updated_at=now();
    else
      update public.ur_play_development_cases c
      set status='resolved',resolution_action='evidence_cleared',resolution_notes='Pendência deixou de existir na fonte de verdade.',
          resolved_at=coalesce(c.resolved_at,now()),updated_at=now(),reasons='[]'::jsonb,
          evidence=jsonb_build_object('verified_at',now())
      where c.registration_id=v_registration.id and c.status in ('pending','in_progress');
    end if;
  end loop;

  select
    count(*)::integer,
    count(*) filter(where status='pending')::integer,
    count(*) filter(where status='in_progress')::integer,
    count(*) filter(where status='resolved')::integer,
    count(*) filter(where status='waived')::integer,
    count(*) filter(where reasons ? 'missing_active_level' or reasons ? 'leveling_process_missing')::integer,
    count(*) filter(where reasons ? 'observations_incomplete')::integer,
    count(*) filter(where reasons ? 'leveling_ready_for_review')::integer,
    count(*) filter(where reasons ? 'level_change_review_pending')::integer,
    count(*) filter(where reasons ? 'development_plan_review_due')::integer
  into v_total,v_pending,v_in_progress,v_resolved,v_waived,v_missing_level,v_observation,v_ready_review,v_level_review,v_plan_due
  from public.ur_play_development_cases
  where session_id=target_session;

  update public.ur_play_post_session_tasks
  set managed_by='system',
      status=case when v_pending=0 and v_in_progress=0 then 'completed' else 'in_progress' end,
      evidence=jsonb_build_object(
        'cases_total',v_total,
        'cases_pending',v_pending,
        'cases_in_progress',v_in_progress,
        'cases_resolved',v_resolved,
        'cases_waived',v_waived,
        'missing_level_or_process',v_missing_level,
        'observations_incomplete',v_observation,
        'ready_for_level_review',v_ready_review,
        'pending_level_reviews',v_level_review,
        'development_plans_due',v_plan_due,
        'verified_at',now()
      ),
      completed_at=case when v_pending=0 and v_in_progress=0 then coalesce(completed_at,now()) else null end,
      completed_by=case when v_pending=0 and v_in_progress=0 then coalesce(completed_by,auth.uid()) else null end,
      updated_at=now()
  where session_id=target_session and task_key='development';
end;
$function$;

revoke all on function private.refresh_ur_play_development_evidence(uuid) from public,anon,authenticated;
grant execute on function private.refresh_ur_play_development_evidence(uuid) to service_role;

create or replace function public.refresh_ur_play_development_cases(target_session uuid)
returns void
language plpgsql
security invoker
set search_path to ''
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
revoke all on function public.refresh_ur_play_development_cases(uuid) from public,anon;
grant execute on function public.refresh_ur_play_development_cases(uuid) to authenticated,service_role;

create or replace function public.resolve_ur_play_development_case(
  target_case uuid,
  target_action text,
  target_notes text default null
)
returns public.ur_play_development_cases
language plpgsql
security invoker
set search_path to ''
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
revoke all on function public.resolve_ur_play_development_case(uuid,text,text) from public,anon;
grant execute on function public.resolve_ur_play_development_case(uuid,text,text) to authenticated,service_role;

create or replace function public.waive_ur_play_development_case(target_case uuid,target_reason text)
returns public.ur_play_development_cases
language plpgsql
security invoker
set search_path to ''
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
revoke all on function public.waive_ur_play_development_case(uuid,text) from public,anon;
grant execute on function public.waive_ur_play_development_case(uuid,text) to authenticated,service_role;

create or replace function public.reopen_ur_play_development_case(target_case uuid,target_reason text)
returns public.ur_play_development_cases
language plpgsql
security invoker
set search_path to ''
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
revoke all on function public.reopen_ur_play_development_case(uuid,text) from public,anon;
grant execute on function public.reopen_ur_play_development_case(uuid,text) to authenticated,service_role;

update public.ur_play_post_session_tasks
set managed_by='system',updated_at=now()
where task_key='development';

create or replace function private.refresh_ur_play_post_session_automatic_tasks(target_session uuid)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_match_count integer := 0;
  v_ranked_match_count integer := 0;
  v_transaction_count integer := 0;
  v_ranking_ready boolean := false;
  v_coin_run public.ur_coin_processing_runs%rowtype;
begin
  perform private.ensure_ur_play_post_session_tasks(target_session);

  select count(*)::integer into v_match_count from public.matches m where m.session_id=target_session and m.status='completed';
  select count(*)::integer into v_ranked_match_count from public.matches m where m.session_id=target_session and m.status='completed'
    and exists(select 1 from public.ranking_processing_runs r where r.source_type='match_result' and r.source_id=m.id and r.status='completed');
  select count(*)::integer into v_transaction_count from public.ranking_transactions t where t.session_id=target_session and t.status='homologated';
  v_ranking_ready := v_match_count > 0 and v_ranked_match_count=v_match_count;

  update public.ur_play_post_session_tasks set
    status=case when v_ranking_ready then 'completed' else 'pending' end,
    evidence=jsonb_build_object('completed_matches',v_match_count,'ranked_matches',v_ranked_match_count,'ranking_transactions',v_transaction_count,'verified_at',now()),
    completed_at=case when v_ranking_ready then coalesce(completed_at,now()) else null end,
    completed_by=case when v_ranking_ready then coalesce(completed_by,auth.uid()) else null end,updated_at=now()
  where session_id=target_session and task_key='ranking_data';

  begin
    v_coin_run := private.process_ur_play_session_coins(target_session,gen_random_uuid());
    update public.ur_play_post_session_tasks set status='completed',managed_by='system',
      evidence=jsonb_build_object('processing_run_id',v_coin_run.id,'rule_set_id',v_coin_run.rule_set_id,'generated_transactions',v_coin_run.generated_count,
        'reversal_transactions',v_coin_run.reversal_count,'credited_amount',v_coin_run.credited_amount,'debited_amount',v_coin_run.debited_amount,
        'net_amount',v_coin_run.credited_amount-v_coin_run.debited_amount,'evaluated_zero_rules',v_coin_run.evaluated_zero_count,
        'input_fingerprint',v_coin_run.input_fingerprint,'verified_at',now()),
      completed_at=coalesce(completed_at,now()),completed_by=coalesce(completed_by,auth.uid()),updated_at=now()
    where session_id=target_session and task_key='ur_coins';
  exception when others then
    update public.ur_play_post_session_tasks set status='pending',managed_by='system',evidence=jsonb_build_object('error',sqlerrm,'verified_at',now()),
      completed_at=null,completed_by=null,updated_at=now() where session_id=target_session and task_key='ur_coins';
  end;

  perform private.refresh_ur_play_retention_evidence(target_session);
  perform private.refresh_ur_play_development_evidence(target_session);
end;
$function$;