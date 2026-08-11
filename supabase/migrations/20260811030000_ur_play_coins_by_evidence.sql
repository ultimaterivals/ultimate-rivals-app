create table if not exists public.ur_coin_processing_runs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ur_play_sessions(id) on delete cascade,
  rule_set_id uuid not null references public.ur_coin_rule_sets(id) on delete restrict,
  status text not null default 'processing',
  input_fingerprint text not null,
  generated_count integer not null default 0,
  reversal_count integer not null default 0,
  credited_amount integer not null default 0,
  debited_amount integer not null default 0,
  evaluated_zero_count integer not null default 0,
  client_operation_id uuid not null unique,
  created_by uuid references public.profiles(id) on delete restrict,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ur_coin_processing_status_check check (status in ('processing','completed')),
  constraint ur_coin_processing_counts_check check (
    generated_count >= 0 and reversal_count >= 0 and credited_amount >= 0 and
    debited_amount >= 0 and evaluated_zero_count >= 0
  )
);

create index if not exists ur_coin_processing_runs_session_idx
  on public.ur_coin_processing_runs(session_id,completed_at desc);

alter table public.ur_coin_processing_runs enable row level security;
revoke all on table public.ur_coin_processing_runs from public, anon;
grant select on table public.ur_coin_processing_runs to authenticated, service_role;

create policy ur_coin_processing_runs_read
on public.ur_coin_processing_runs
for select
to authenticated
using (private.operates_ur_play_session(session_id));

create or replace function private.process_ur_play_session_coins(
  target_session uuid,
  operation_id uuid
)
returns public.ur_coin_processing_runs
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_actor uuid := auth.uid();
  v_session public.ur_play_sessions%rowtype;
  v_rule_set public.ur_coin_rule_sets%rowtype;
  v_participation public.ur_coin_rules%rowtype;
  v_win public.ur_coin_rules%rowtype;
  v_loss public.ur_coin_rules%rowtype;
  v_run public.ur_coin_processing_runs%rowtype;
  v_previous public.ur_coin_processing_runs%rowtype;
  v_old public.ur_coin_transactions%rowtype;
  v_entitlement record;
  v_result_rule public.ur_coin_rules%rowtype;
  v_inserted uuid;
  v_fingerprint text;
  v_match_count integer := 0;
  v_homologated_count integer := 0;
  v_generated integer := 0;
  v_reversed integer := 0;
  v_credited integer := 0;
  v_debited integer := 0;
  v_zero integer := 0;
  v_key text;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if operation_id is null then raise exception 'OPERATION_ID_REQUIRED' using errcode='23514'; end if;
  if not private.operates_ur_play_session(target_session) then
    raise exception 'SESSION_OPERATION_DENIED' using errcode='42501';
  end if;

  select * into v_run
  from public.ur_coin_processing_runs
  where client_operation_id=operation_id;
  if found then return v_run; end if;

  select * into v_session
  from public.ur_play_sessions
  where id=target_session
  for update;
  if not found then raise exception 'UR_PLAY_SESSION_NOT_FOUND'; end if;
  if v_session.status <> 'completed' then
    raise exception 'UR_COIN_SESSION_NOT_COMPLETED' using errcode='23514';
  end if;

  select * into v_rule_set
  from public.ur_coin_rule_sets rs
  where rs.status='active'
    and rs.starts_at <= coalesce(v_session.ends_at,now())
    and (rs.ends_at is null or rs.ends_at > v_session.starts_at)
  order by rs.starts_at desc,rs.created_at desc
  limit 1;
  if not found then raise exception 'UR_COIN_RULE_SET_NOT_FOUND'; end if;

  select * into v_participation
  from public.ur_coin_rules
  where rule_set_id=v_rule_set.id and code='ur_play_participation' and status='active';
  select * into v_win
  from public.ur_coin_rules
  where rule_set_id=v_rule_set.id and code='match_win' and status='active';
  select * into v_loss
  from public.ur_coin_rules
  where rule_set_id=v_rule_set.id and code='match_loss' and status='active';

  if v_participation.id is null or v_win.id is null or v_loss.id is null then
    raise exception 'UR_COIN_RULES_INCOMPLETE' using errcode='23514';
  end if;
  if v_participation.source_type <> 'match_result'
    or v_win.source_type <> 'match_result'
    or v_loss.source_type <> 'match_result' then
    raise exception 'UR_COIN_RULE_SOURCE_UNSUPPORTED' using errcode='23514';
  end if;

  select count(*)::integer
  into v_match_count
  from public.matches m
  where m.session_id=target_session
    and m.status not in ('cancelled','abandoned');

  select count(*)::integer
  into v_homologated_count
  from public.matches m
  join public.match_results mr on mr.match_id=m.id
  where m.session_id=target_session
    and m.status='completed'
    and mr.result_status='homologated';

  if v_match_count < 1 or v_homologated_count <> v_match_count then
    raise exception 'UR_COIN_SESSION_RESULTS_NOT_READY' using errcode='23514';
  end if;

  select md5(concat_ws('|',
    v_session.id::text,
    v_rule_set.id::text,
    concat_ws(':',v_participation.id,v_participation.amount,v_participation.direction,v_participation.transaction_type),
    concat_ws(':',v_win.id,v_win.amount,v_win.direction,v_win.transaction_type),
    concat_ws(':',v_loss.id,v_loss.amount,v_loss.direction,v_loss.transaction_type),
    coalesce((
      select string_agg(
        concat_ws(':',m.id,mr.id,mr.winner_side_id,mr.score_a,mr.score_b,mr.result_status),
        ',' order by m.id
      )
      from public.matches m
      join public.match_results mr on mr.match_id=m.id
      where m.session_id=target_session
        and m.status='completed'
        and mr.result_status='homologated'
    ),''),
    coalesce((
      select string_agg(
        concat_ws(':',mp.match_id,mp.id,mp.athlete_id,mp.side_id,mp.status),
        ',' order by mp.match_id,mp.athlete_id
      )
      from public.match_participants mp
      join public.matches m on m.id=mp.match_id
      where m.session_id=target_session and mp.status='active'
    ),'')
  )) into v_fingerprint;

  select * into v_previous
  from public.ur_coin_processing_runs
  where session_id=target_session and status='completed'
  order by completed_at desc,created_at desc
  limit 1;

  if found and v_previous.input_fingerprint=v_fingerprint then
    return v_previous;
  end if;

  insert into public.ur_coin_processing_runs(
    session_id,rule_set_id,status,input_fingerprint,client_operation_id,created_by,metadata
  ) values(
    target_session,v_rule_set.id,'processing',v_fingerprint,operation_id,v_actor,
    jsonb_build_object('processor','ur_play_session_coins','rule_set_code',v_rule_set.code)
  ) returning * into v_run;

  for v_old in
    select t.*
    from public.ur_coin_transactions t
    where t.metadata->>'processor'='ur_play_session_coins'
      and t.metadata->>'session_id'=target_session::text
      and t.transaction_type <> 'reversal'
      and t.amount > 0
      and not exists (
        select 1 from public.ur_coin_transactions reversal
        where reversal.reversal_of=t.id
      )
    order by t.created_at,t.id
  loop
    v_inserted := null;
    v_key := 'urc:reversal:'||v_old.id::text;
    insert into public.ur_coin_transactions(
      athlete_id,rule_id,transaction_type,direction,amount,source_type,source_id,
      season_id,idempotency_key,reason,reversal_of,created_by,metadata
    ) values(
      v_old.athlete_id,
      v_old.rule_id,
      'reversal',
      case when v_old.direction='credit' then 'debit'::public.ur_coin_direction else 'credit'::public.ur_coin_direction end,
      v_old.amount,
      'ur_play_coin_reconciliation',
      target_session,
      v_session.season_id,
      v_key,
      'Estorno automático por reprocessamento UR Play',
      v_old.id,
      v_actor,
      jsonb_build_object(
        'processor','ur_play_session_coins',
        'session_id',target_session,
        'processing_run_id',v_run.id,
        'input_fingerprint',v_fingerprint,
        'reversal_of',v_old.id
      )
    )
    on conflict(idempotency_key) do nothing
    returning id into v_inserted;

    if v_inserted is not null then
      v_reversed := v_reversed + 1;
      if v_old.direction='credit' then
        v_debited := v_debited + v_old.amount;
      else
        v_credited := v_credited + v_old.amount;
      end if;
    end if;
  end loop;

  for v_entitlement in
    select
      m.id as match_id,
      mr.id as result_id,
      mr.winner_side_id,
      mp.athlete_id,
      mp.side_id
    from public.matches m
    join public.match_results mr on mr.match_id=m.id and mr.result_status='homologated'
    join public.match_participants mp on mp.match_id=m.id and mp.status='active'
    where m.session_id=target_session and m.status='completed'
    order by m.id,mp.athlete_id
  loop
    if v_participation.amount > 0 then
      v_inserted := null;
      v_key := concat_ws(':','urc',target_session,v_entitlement.match_id,v_entitlement.athlete_id,v_participation.code,v_fingerprint);
      insert into public.ur_coin_transactions(
        athlete_id,rule_id,transaction_type,direction,amount,source_type,source_id,
        season_id,idempotency_key,reason,created_by,metadata
      ) values(
        v_entitlement.athlete_id,v_participation.id,v_participation.transaction_type,
        v_participation.direction,v_participation.amount,v_participation.source_type,
        v_entitlement.result_id,v_session.season_id,v_key,v_participation.name,v_actor,
        jsonb_build_object(
          'processor','ur_play_session_coins',
          'session_id',target_session,
          'match_id',v_entitlement.match_id,
          'result_id',v_entitlement.result_id,
          'rule_code',v_participation.code,
          'processing_run_id',v_run.id,
          'input_fingerprint',v_fingerprint
        )
      )
      on conflict(idempotency_key) do nothing
      returning id into v_inserted;
      if v_inserted is not null then
        v_generated := v_generated + 1;
        if v_participation.direction='credit' then
          v_credited := v_credited + v_participation.amount;
        else
          v_debited := v_debited + v_participation.amount;
        end if;
      end if;
    else
      v_zero := v_zero + 1;
    end if;

    if v_entitlement.side_id=v_entitlement.winner_side_id then
      v_result_rule := v_win;
    else
      v_result_rule := v_loss;
    end if;

    if v_result_rule.amount > 0 then
      v_inserted := null;
      v_key := concat_ws(':','urc',target_session,v_entitlement.match_id,v_entitlement.athlete_id,v_result_rule.code,v_fingerprint);
      insert into public.ur_coin_transactions(
        athlete_id,rule_id,transaction_type,direction,amount,source_type,source_id,
        season_id,idempotency_key,reason,created_by,metadata
      ) values(
        v_entitlement.athlete_id,v_result_rule.id,v_result_rule.transaction_type,
        v_result_rule.direction,v_result_rule.amount,v_result_rule.source_type,
        v_entitlement.result_id,v_session.season_id,v_key,v_result_rule.name,v_actor,
        jsonb_build_object(
          'processor','ur_play_session_coins',
          'session_id',target_session,
          'match_id',v_entitlement.match_id,
          'result_id',v_entitlement.result_id,
          'rule_code',v_result_rule.code,
          'processing_run_id',v_run.id,
          'input_fingerprint',v_fingerprint
        )
      )
      on conflict(idempotency_key) do nothing
      returning id into v_inserted;
      if v_inserted is not null then
        v_generated := v_generated + 1;
        if v_result_rule.direction='credit' then
          v_credited := v_credited + v_result_rule.amount;
        else
          v_debited := v_debited + v_result_rule.amount;
        end if;
      end if;
    else
      v_zero := v_zero + 1;
    end if;
  end loop;

  update public.ur_coin_processing_runs
  set
    status='completed',
    generated_count=v_generated,
    reversal_count=v_reversed,
    credited_amount=v_credited,
    debited_amount=v_debited,
    evaluated_zero_count=v_zero,
    completed_at=now(),
    metadata=metadata||jsonb_build_object(
      'match_count',v_match_count,
      'homologated_match_count',v_homologated_count,
      'net_amount',v_credited-v_debited,
      'participation_rule',jsonb_build_object('code',v_participation.code,'amount',v_participation.amount),
      'win_rule',jsonb_build_object('code',v_win.code,'amount',v_win.amount),
      'loss_rule',jsonb_build_object('code',v_loss.code,'amount',v_loss.amount)
    )
  where id=v_run.id
  returning * into v_run;

  insert into public.audit_logs(
    actor_user_id,action,entity_type,entity_id,after_data,metadata
  ) values(
    v_actor,
    'ur_coins.session_processed',
    'ur_play_session',
    target_session,
    jsonb_build_object(
      'processing_run_id',v_run.id,
      'generated_count',v_generated,
      'reversal_count',v_reversed,
      'credited_amount',v_credited,
      'debited_amount',v_debited,
      'evaluated_zero_count',v_zero,
      'input_fingerprint',v_fingerprint
    ),
    jsonb_build_object('rule_set_id',v_rule_set.id,'rule_set_code',v_rule_set.code)
  );

  return v_run;
end;
$function$;

revoke all on function private.process_ur_play_session_coins(uuid,uuid)
  from public, anon;
grant execute on function private.process_ur_play_session_coins(uuid,uuid)
  to authenticated, service_role;

create or replace function public.admin_process_ur_play_session_coins(
  target_session uuid,
  operation_id uuid
)
returns public.ur_coin_processing_runs
language sql
security invoker
set search_path to ''
as $function$
  select private.process_ur_play_session_coins(target_session,operation_id);
$function$;

revoke all on function public.admin_process_ur_play_session_coins(uuid,uuid)
  from public, anon;
grant execute on function public.admin_process_ur_play_session_coins(uuid,uuid)
  to authenticated, service_role;

create or replace function private.ensure_ur_play_post_session_tasks(target_session uuid)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_session public.ur_play_sessions%rowtype;
  v_base timestamptz := now();
begin
  select * into v_session
  from public.ur_play_sessions
  where id=target_session;
  if not found then raise exception 'UR_PLAY_SESSION_NOT_FOUND'; end if;
  if v_session.status <> 'completed' then return; end if;

  insert into public.ur_play_post_session_tasks(
    session_id,task_key,status,managed_by,blocking,due_at
  ) values
    (target_session,'ranking_data','pending','system',true,v_base+interval '24 hours'),
    (target_session,'ur_coins','pending','system',true,v_base+interval '24 hours'),
    (target_session,'finance','pending','human',true,v_base+interval '24 hours'),
    (target_session,'incidents','pending','human',true,v_base+interval '24 hours'),
    (target_session,'development','pending','human',true,v_base+interval '24 hours'),
    (target_session,'media','pending','human',true,v_base+interval '48 hours'),
    (target_session,'retention','pending','human',true,v_base+interval '48 hours'),
    (target_session,'feedback','pending','human',true,v_base+interval '48 hours'),
    (target_session,'report','pending','human',true,v_base+interval '48 hours')
  on conflict(session_id,task_key) do nothing;

  update public.ur_play_post_session_tasks
  set managed_by='system',updated_at=now()
  where session_id=target_session and task_key='ur_coins' and managed_by<>'system';
end;
$function$;

revoke all on function private.ensure_ur_play_post_session_tasks(uuid)
  from public, anon, authenticated;
grant execute on function private.ensure_ur_play_post_session_tasks(uuid)
  to service_role;

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

  select count(*)::integer
  into v_match_count
  from public.matches m
  where m.session_id=target_session and m.status='completed';

  select count(*)::integer
  into v_ranked_match_count
  from public.matches m
  where m.session_id=target_session
    and m.status='completed'
    and exists (
      select 1
      from public.ranking_processing_runs r
      where r.source_type='match_result'
        and r.source_id=m.id
        and r.status='completed'
    );

  select count(*)::integer
  into v_transaction_count
  from public.ranking_transactions t
  where t.session_id=target_session and t.status='homologated';

  v_ranking_ready := v_match_count > 0 and v_ranked_match_count=v_match_count;

  update public.ur_play_post_session_tasks
  set
    status=case when v_ranking_ready then 'completed' else 'pending' end,
    evidence=jsonb_build_object(
      'completed_matches',v_match_count,
      'ranked_matches',v_ranked_match_count,
      'ranking_transactions',v_transaction_count,
      'verified_at',now()
    ),
    completed_at=case when v_ranking_ready then coalesce(completed_at,now()) else null end,
    completed_by=case when v_ranking_ready then coalesce(completed_by,auth.uid()) else null end,
    updated_at=now()
  where session_id=target_session and task_key='ranking_data';

  begin
    v_coin_run := private.process_ur_play_session_coins(target_session,gen_random_uuid());
    update public.ur_play_post_session_tasks
    set
      status='completed',
      managed_by='system',
      evidence=jsonb_build_object(
        'processing_run_id',v_coin_run.id,
        'rule_set_id',v_coin_run.rule_set_id,
        'generated_transactions',v_coin_run.generated_count,
        'reversal_transactions',v_coin_run.reversal_count,
        'credited_amount',v_coin_run.credited_amount,
        'debited_amount',v_coin_run.debited_amount,
        'net_amount',v_coin_run.credited_amount-v_coin_run.debited_amount,
        'evaluated_zero_rules',v_coin_run.evaluated_zero_count,
        'input_fingerprint',v_coin_run.input_fingerprint,
        'verified_at',now()
      ),
      completed_at=coalesce(completed_at,now()),
      completed_by=coalesce(completed_by,auth.uid()),
      updated_at=now()
    where session_id=target_session and task_key='ur_coins';
  exception when others then
    update public.ur_play_post_session_tasks
    set
      status='pending',
      managed_by='system',
      evidence=jsonb_build_object(
        'error',sqlerrm,
        'verified_at',now()
      ),
      completed_at=null,
      completed_by=null,
      updated_at=now()
    where session_id=target_session and task_key='ur_coins';
  end;
end;
$function$;

revoke all on function private.refresh_ur_play_post_session_automatic_tasks(uuid)
  from public, anon, authenticated;
grant execute on function private.refresh_ur_play_post_session_automatic_tasks(uuid)
  to service_role;

update public.ur_play_post_session_tasks
set managed_by='system',updated_at=now()
where task_key='ur_coins' and managed_by<>'system';
