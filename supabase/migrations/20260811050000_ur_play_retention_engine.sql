create table if not exists public.ur_play_retention_followups (
  id uuid primary key default gen_random_uuid(),
  source_session_id uuid not null references public.ur_play_sessions(id) on delete cascade,
  source_registration_id uuid not null references public.ur_play_registrations(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  participation_number integer not null,
  cohort text not null,
  status text not null default 'pending',
  suggested_opportunity_id uuid references public.demand_opportunities(id) on delete set null,
  due_at timestamptz not null,
  contacted_at timestamptz,
  contacted_by uuid references public.profiles(id),
  contact_channel text,
  contact_notes text,
  converted_at timestamptz,
  converted_session_id uuid references public.ur_play_sessions(id) on delete set null,
  waived_at timestamptz,
  waived_by uuid references public.profiles(id),
  waiver_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ur_play_retention_followups_source_unique unique(source_registration_id),
  constraint ur_play_retention_followups_cohort_check check (cohort in ('first_time','returning','recurring')),
  constraint ur_play_retention_followups_status_check check (status in ('pending','contacted','converted','waived')),
  constraint ur_play_retention_followups_channel_check check (contact_channel is null or contact_channel in ('whatsapp','instagram','phone','app','email','other')),
  constraint ur_play_retention_followups_waiver_check check (
    status <> 'waived' or (waived_at is not null and waived_by is not null and char_length(trim(coalesce(waiver_reason,''))) >= 10)
  )
);

create index if not exists ur_play_retention_followups_session_idx
  on public.ur_play_retention_followups(source_session_id,status,due_at);
create index if not exists ur_play_retention_followups_athlete_idx
  on public.ur_play_retention_followups(athlete_id,status,created_at);

alter table public.ur_play_retention_followups enable row level security;
revoke all on table public.ur_play_retention_followups from public, anon;
grant select on table public.ur_play_retention_followups to authenticated, service_role;

create policy ur_play_retention_followups_read
on public.ur_play_retention_followups
for select
to authenticated
using (private.operates_ur_play_session(source_session_id));

create or replace function private.refresh_ur_play_retention_evidence(target_session uuid)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_session public.ur_play_sessions%rowtype;
  v_registration public.ur_play_registrations%rowtype;
  v_prior_count integer;
  v_number integer;
  v_cohort text;
  v_event text;
  v_opportunity uuid;
  v_first integer := 0;
  v_returning integer := 0;
  v_recurring integer := 0;
  v_contacted integer := 0;
  v_converted integer := 0;
  v_waived integer := 0;
  v_pending integer := 0;
begin
  select * into v_session from public.ur_play_sessions where id=target_session;
  if not found then raise exception 'UR_PLAY_SESSION_NOT_FOUND'; end if;
  if v_session.status <> 'completed' then return; end if;

  for v_registration in
    select r.*
    from public.ur_play_registrations r
    where r.session_id=target_session
      and r.registration_status='confirmed'
      and r.attendance_status in ('checked_in','present')
  loop
    select count(distinct prior.session_id)::integer
    into v_prior_count
    from public.ur_play_registrations prior
    join public.ur_play_sessions ps on ps.id=prior.session_id
    where prior.athlete_id=v_registration.athlete_id
      and prior.registration_status='confirmed'
      and prior.attendance_status in ('checked_in','present')
      and ps.status='completed'
      and ps.ends_at < v_session.ends_at;

    v_number := v_prior_count + 1;
    v_cohort := case when v_number=1 then 'first_time' when v_number=2 then 'returning' else 'recurring' end;
    v_event := case when v_number=1 then 'first_participation' when v_number=2 then 'second_participation' else 'return_participation' end;

    if not exists (
      select 1 from public.acquisition_events e
      where e.athlete_id=v_registration.athlete_id
        and e.event_name=v_event
        and e.object_type='ur_play_session'
        and e.object_id=target_session
    ) then
      insert into public.acquisition_events(
        athlete_id,event_name,source,occurred_at,object_type,object_id,metadata
      ) values (
        v_registration.athlete_id,v_event,'operational',v_session.ends_at,
        'ur_play_session',target_session,
        jsonb_build_object('participation_number',v_number,'cohort',v_cohort)
      );
    end if;

    if v_number=1 then
      select d.id into v_opportunity
      from public.demand_opportunities d
      where d.opportunity_type='ur_play'
        and d.starts_at is not null
        and d.starts_at > v_session.ends_at
        and d.status in ('collecting_interest','forming','almost_full','confirmed')
        and (d.pole_id=v_session.pole_id or d.pole_id is null)
      order by case when d.pole_id=v_session.pole_id then 0 else 1 end,d.starts_at
      limit 1;

      insert into public.ur_play_retention_followups(
        source_session_id,source_registration_id,athlete_id,participation_number,cohort,status,
        suggested_opportunity_id,due_at
      ) values (
        target_session,v_registration.id,v_registration.athlete_id,v_number,v_cohort,'pending',
        v_opportunity,v_session.ends_at+interval '48 hours'
      )
      on conflict(source_registration_id) do update set
        suggested_opportunity_id=excluded.suggested_opportunity_id,
        updated_at=now();

      if not exists (
        select 1 from public.ur_play_notification_events n
        where n.session_id=target_session
          and n.registration_id=v_registration.id
          and n.event_type='retention_followup_ready'
      ) then
        insert into public.ur_play_notification_events(
          session_id,registration_id,event_type,payload,status
        ) values (
          target_session,v_registration.id,'retention_followup_ready',
          jsonb_build_object('athlete_id',v_registration.athlete_id,'suggested_opportunity_id',v_opportunity),
          'pending'
        );
      end if;
    elsif v_number=2 then
      update public.ur_play_retention_followups f
      set status='converted',converted_at=coalesce(converted_at,v_session.ends_at),
          converted_session_id=target_session,updated_at=now()
      where f.id=(
        select f2.id from public.ur_play_retention_followups f2
        where f2.athlete_id=v_registration.athlete_id and f2.cohort='first_time'
          and f2.status in ('pending','contacted')
        order by f2.created_at desc limit 1
      );
    end if;
  end loop;

  select
    count(*) filter(where cohort='first_time')::integer,
    count(*) filter(where cohort='returning')::integer,
    count(*) filter(where cohort='recurring')::integer
  into v_first,v_returning,v_recurring
  from (
    select r.athlete_id,
      case
        when (select count(distinct r2.session_id) from public.ur_play_registrations r2 join public.ur_play_sessions s2 on s2.id=r2.session_id
              where r2.athlete_id=r.athlete_id and r2.registration_status='confirmed' and r2.attendance_status in ('checked_in','present')
                and s2.status='completed' and s2.ends_at <= v_session.ends_at)=1 then 'first_time'
        when (select count(distinct r2.session_id) from public.ur_play_registrations r2 join public.ur_play_sessions s2 on s2.id=r2.session_id
              where r2.athlete_id=r.athlete_id and r2.registration_status='confirmed' and r2.attendance_status in ('checked_in','present')
                and s2.status='completed' and s2.ends_at <= v_session.ends_at)=2 then 'returning'
        else 'recurring'
      end cohort
    from public.ur_play_registrations r
    where r.session_id=target_session and r.registration_status='confirmed' and r.attendance_status in ('checked_in','present')
  ) q;

  select
    count(*) filter(where status='contacted')::integer,
    count(*) filter(where status='converted')::integer,
    count(*) filter(where status='waived')::integer,
    count(*) filter(where status='pending')::integer
  into v_contacted,v_converted,v_waived,v_pending
  from public.ur_play_retention_followups
  where source_session_id=target_session and cohort='first_time';

  update public.ur_play_post_session_tasks
  set managed_by='system',
      status=case when v_first=0 or v_pending=0 then 'completed' else 'in_progress' end,
      evidence=jsonb_build_object(
        'first_time_athletes',v_first,
        'second_participation_athletes',v_returning,
        'recurring_athletes',v_recurring,
        'followups_contacted',v_contacted,
        'followups_converted',v_converted,
        'followups_waived',v_waived,
        'followups_pending',v_pending,
        'followups_total',v_contacted+v_converted+v_waived+v_pending,
        'verified_at',now()
      ),
      completed_at=case when v_first=0 or v_pending=0 then coalesce(completed_at,now()) else null end,
      completed_by=case when v_first=0 or v_pending=0 then coalesce(completed_by,auth.uid()) else null end,
      updated_at=now()
  where session_id=target_session and task_key='retention';
end;
$function$;

revoke all on function private.refresh_ur_play_retention_evidence(uuid) from public,anon,authenticated;
grant execute on function private.refresh_ur_play_retention_evidence(uuid) to service_role;

create or replace function private.confirm_ur_play_retention_contact(
  target_followup uuid,
  target_channel text,
  target_notes text default null
)
returns public.ur_play_retention_followups
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_actor uuid := auth.uid();
  v_row public.ur_play_retention_followups%rowtype;
  v_notes text := nullif(trim(coalesce(target_notes,'')),'');
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  select * into v_row from public.ur_play_retention_followups where id=target_followup for update;
  if not found then raise exception 'RETENTION_FOLLOWUP_NOT_FOUND'; end if;
  if not private.operates_ur_play_session(v_row.source_session_id) then raise exception 'SESSION_OPERATION_DENIED' using errcode='42501'; end if;
  if target_channel not in ('whatsapp','instagram','phone','app','email','other') then raise exception 'INVALID_RETENTION_CHANNEL' using errcode='23514'; end if;
  if exists(select 1 from public.ur_play_post_session_closures c where c.session_id=v_row.source_session_id and c.status='closed') then
    raise exception 'POST_SESSION_ALREADY_CLOSED' using errcode='23514';
  end if;
  if v_row.status='converted' then return v_row; end if;

  update public.ur_play_retention_followups
  set status='contacted',contacted_at=now(),contacted_by=v_actor,contact_channel=target_channel,
      contact_notes=v_notes,updated_at=now()
  where id=target_followup returning * into v_row;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(v_actor,'ur_play.retention.contact_confirmed','ur_play_retention_followup',v_row.id,
    jsonb_build_object('status',v_row.status,'channel',target_channel,'source_session_id',v_row.source_session_id),
    jsonb_build_object('notes',v_notes));

  perform private.refresh_ur_play_retention_evidence(v_row.source_session_id);
  return v_row;
end;
$function$;

create or replace function public.confirm_ur_play_retention_contact(target_followup uuid,target_channel text,target_notes text default null)
returns public.ur_play_retention_followups
language sql security invoker set search_path to ''
as $function$ select private.confirm_ur_play_retention_contact(target_followup,target_channel,target_notes); $function$;
revoke all on function public.confirm_ur_play_retention_contact(uuid,text,text) from public,anon;
grant execute on function public.confirm_ur_play_retention_contact(uuid,text,text) to authenticated,service_role;

create or replace function private.waive_ur_play_retention_followup(target_followup uuid,target_reason text)
returns public.ur_play_retention_followups
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_actor uuid := auth.uid();
  v_row public.ur_play_retention_followups%rowtype;
  v_reason text := nullif(trim(coalesce(target_reason,'')),'');
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not private.has_any_role(array['admin']::public.app_role[]) then raise exception 'ADMIN_RETENTION_WAIVER_REQUIRED' using errcode='42501'; end if;
  if v_reason is null or char_length(v_reason)<10 then raise exception 'RETENTION_WAIVER_REASON_REQUIRED' using errcode='23514'; end if;
  select * into v_row from public.ur_play_retention_followups where id=target_followup for update;
  if not found then raise exception 'RETENTION_FOLLOWUP_NOT_FOUND'; end if;
  if not private.operates_ur_play_session(v_row.source_session_id) then raise exception 'SESSION_OPERATION_DENIED' using errcode='42501'; end if;
  if exists(select 1 from public.ur_play_post_session_closures c where c.session_id=v_row.source_session_id and c.status='closed') then
    raise exception 'POST_SESSION_ALREADY_CLOSED' using errcode='23514';
  end if;

  update public.ur_play_retention_followups
  set status='waived',waived_at=now(),waived_by=v_actor,waiver_reason=v_reason,updated_at=now()
  where id=target_followup returning * into v_row;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(v_actor,'ur_play.retention.followup_waived','ur_play_retention_followup',v_row.id,
    jsonb_build_object('status','waived','source_session_id',v_row.source_session_id),jsonb_build_object('reason',v_reason));
  perform private.refresh_ur_play_retention_evidence(v_row.source_session_id);
  return v_row;
end;
$function$;

create or replace function public.waive_ur_play_retention_followup(target_followup uuid,target_reason text)
returns public.ur_play_retention_followups
language sql security invoker set search_path to ''
as $function$ select private.waive_ur_play_retention_followup(target_followup,target_reason); $function$;
revoke all on function public.waive_ur_play_retention_followup(uuid,text) from public,anon;
grant execute on function public.waive_ur_play_retention_followup(uuid,text) to authenticated,service_role;

-- Retenção passa a ser uma frente controlada por evidência.
update public.ur_play_post_session_tasks set managed_by='system',updated_at=now() where task_key='retention';

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
end;
$function$;
