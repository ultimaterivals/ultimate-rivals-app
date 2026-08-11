create table if not exists public.ur_play_financial_closeouts (
  session_id uuid primary key references public.ur_play_sessions(id) on delete cascade,
  status text not null default 'confirmed',
  confirmed_at timestamptz not null,
  confirmed_by uuid not null references public.profiles(id) on delete restrict,
  notes text,
  evidence_snapshot jsonb not null default '{}'::jsonb,
  reopened_at timestamptz,
  reopened_by uuid references public.profiles(id) on delete restrict,
  reopen_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ur_play_financial_closeout_status_check check (status in ('confirmed','reopened')),
  constraint ur_play_financial_closeout_reopen_check check (
    status <> 'reopened' or (
      reopened_at is not null and reopened_by is not null and
      char_length(trim(coalesce(reopen_reason,''))) >= 10
    )
  )
);

alter table public.ur_play_financial_closeouts enable row level security;
revoke all on table public.ur_play_financial_closeouts from public, anon;
grant select on table public.ur_play_financial_closeouts to authenticated, service_role;

create policy ur_play_financial_closeouts_read
on public.ur_play_financial_closeouts
for select
to authenticated
using (private.operates_ur_play_session(session_id));

create or replace function private.ur_play_finance_snapshot(target_session uuid)
returns table(
  session_status public.ur_play_session_status,
  confirmed_registrations integer,
  attended_registrations integer,
  pending_registration_payments integer,
  paid_registrations integer,
  not_required_registrations integer,
  waived_registrations integer,
  refunded_registrations integer,
  declared_paid_amount numeric,
  charge_count integer,
  open_charge_count integer,
  verified_charge_amount numeric,
  waived_charge_amount numeric,
  refunded_charge_amount numeric,
  submitted_payment_count integer,
  verified_payment_amount numeric,
  refunded_payment_amount numeric,
  consumed_credit_units integer,
  refunded_credit_units integer,
  verified_revenue_amount numeric,
  reconciled_revenue_amount numeric,
  open_revenue_amount numeric,
  verified_expense_amount numeric,
  reconciled_expense_amount numeric,
  open_expense_amount numeric,
  recorded_net_amount numeric,
  direct_revenue_gap numeric,
  commercial_ready boolean,
  scope_confirmed boolean,
  ready boolean
)
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_status public.ur_play_session_status;
  v_confirmed integer := 0;
  v_attended integer := 0;
  v_pending_reg integer := 0;
  v_paid integer := 0;
  v_not_required integer := 0;
  v_waived integer := 0;
  v_refunded integer := 0;
  v_declared_paid numeric := 0;
  v_charge_count integer := 0;
  v_open_charges integer := 0;
  v_verified_charge numeric := 0;
  v_waived_charge numeric := 0;
  v_refunded_charge numeric := 0;
  v_submitted_payments integer := 0;
  v_verified_payment numeric := 0;
  v_refunded_payment numeric := 0;
  v_consumed_credits integer := 0;
  v_refunded_credits integer := 0;
  v_verified_revenue numeric := 0;
  v_reconciled_revenue numeric := 0;
  v_open_revenue numeric := 0;
  v_verified_expense numeric := 0;
  v_reconciled_expense numeric := 0;
  v_open_expense numeric := 0;
  v_recorded_revenue numeric := 0;
  v_recorded_expense numeric := 0;
  v_gap numeric := 0;
  v_scope boolean := false;
  v_commercial boolean := false;
begin
  if not private.operates_ur_play_session(target_session) then
    raise exception 'SESSION_OPERATION_DENIED' using errcode='42501';
  end if;

  select s.status into v_status
  from public.ur_play_sessions s
  where s.id=target_session;
  if not found then raise exception 'UR_PLAY_SESSION_NOT_FOUND'; end if;

  select
    count(*) filter(where r.registration_status='confirmed')::integer,
    count(*) filter(where r.registration_status='confirmed' and r.attendance_status in ('checked_in','present'))::integer,
    count(*) filter(where r.registration_status='confirmed' and r.payment_status='pending')::integer,
    count(*) filter(where r.registration_status='confirmed' and r.payment_status='paid')::integer,
    count(*) filter(where r.registration_status='confirmed' and r.payment_status='not_required')::integer,
    count(*) filter(where r.registration_status='confirmed' and r.payment_status='waived')::integer,
    count(*) filter(where r.registration_status='confirmed' and r.payment_status='refunded')::integer,
    coalesce(sum(r.payment_amount) filter(where r.registration_status='confirmed' and r.payment_status='paid'),0)
  into
    v_confirmed,v_attended,v_pending_reg,v_paid,v_not_required,v_waived,v_refunded,v_declared_paid
  from public.ur_play_registrations r
  where r.session_id=target_session;

  select
    count(*)::integer,
    count(*) filter(where c.status in ('pending','submitted'))::integer,
    coalesce(sum(c.amount) filter(where c.status='verified'),0),
    coalesce(sum(c.amount) filter(where c.status='waived'),0),
    coalesce(sum(c.amount) filter(where c.status='refunded'),0)
  into v_charge_count,v_open_charges,v_verified_charge,v_waived_charge,v_refunded_charge
  from public.charges c
  join public.ur_play_registrations r on r.id=c.ur_play_registration_id
  where r.session_id=target_session;

  select
    count(*) filter(where p.status='submitted')::integer,
    coalesce(sum(p.amount) filter(where p.status='verified'),0),
    coalesce(sum(p.amount) filter(where p.status='refunded'),0)
  into v_submitted_payments,v_verified_payment,v_refunded_payment
  from public.payments p
  join public.charges c on c.id=p.charge_id
  join public.ur_play_registrations r on r.id=c.ur_play_registration_id
  where r.session_id=target_session;

  select
    coalesce(sum(l.consumed_delta) filter(where l.event_type='consume'),0)::integer,
    abs(coalesce(sum(l.consumed_delta) filter(where l.event_type='refund'),0))::integer
  into v_consumed_credits,v_refunded_credits
  from public.commercial_credit_ledger l
  join public.activity_reservations ar on ar.id=l.reservation_id
  join public.ur_play_registrations r on r.id=ar.ur_play_registration_id
  where r.session_id=target_session;

  select
    coalesce(sum(re.amount) filter(where re.status='verified'),0),
    coalesce(sum(re.amount) filter(where re.status='reconciled'),0),
    coalesce(sum(re.amount) filter(where re.status in ('projected','pending')),0)
  into v_verified_revenue,v_reconciled_revenue,v_open_revenue
  from public.revenue_entries re
  where re.ur_play_session_id=target_session;

  select
    coalesce(sum(ex.amount) filter(where ex.status='verified'),0),
    coalesce(sum(ex.amount) filter(where ex.status='reconciled'),0),
    coalesce(sum(ex.amount) filter(where ex.status in ('projected','pending')),0)
  into v_verified_expense,v_reconciled_expense,v_open_expense
  from public.expense_entries ex
  where ex.ur_play_session_id=target_session;

  v_recorded_revenue := v_verified_revenue + v_reconciled_revenue;
  v_recorded_expense := v_verified_expense + v_reconciled_expense;
  v_gap := greatest(v_declared_paid - v_recorded_revenue,0);

  select exists(
    select 1 from public.ur_play_financial_closeouts fc
    where fc.session_id=target_session and fc.status='confirmed'
  ) into v_scope;

  v_commercial :=
    v_status='completed'
    and v_confirmed > 0
    and v_pending_reg=0
    and v_open_charges=0
    and v_submitted_payments=0
    and v_open_revenue=0
    and v_open_expense=0
    and v_gap=0;

  return query select
    v_status,
    v_confirmed,
    v_attended,
    v_pending_reg,
    v_paid,
    v_not_required,
    v_waived,
    v_refunded,
    v_declared_paid,
    v_charge_count,
    v_open_charges,
    v_verified_charge,
    v_waived_charge,
    v_refunded_charge,
    v_submitted_payments,
    v_verified_payment,
    v_refunded_payment,
    v_consumed_credits,
    v_refunded_credits,
    v_verified_revenue,
    v_reconciled_revenue,
    v_open_revenue,
    v_verified_expense,
    v_reconciled_expense,
    v_open_expense,
    v_recorded_revenue-v_recorded_expense,
    v_gap,
    v_commercial,
    v_scope,
    v_commercial and v_scope;
end;
$function$;

revoke all on function private.ur_play_finance_snapshot(uuid) from public, anon;
grant execute on function private.ur_play_finance_snapshot(uuid) to authenticated, service_role;

create or replace function public.get_ur_play_finance_snapshot(target_session uuid)
returns table(
  session_status public.ur_play_session_status,
  confirmed_registrations integer,
  attended_registrations integer,
  pending_registration_payments integer,
  paid_registrations integer,
  not_required_registrations integer,
  waived_registrations integer,
  refunded_registrations integer,
  declared_paid_amount numeric,
  charge_count integer,
  open_charge_count integer,
  verified_charge_amount numeric,
  waived_charge_amount numeric,
  refunded_charge_amount numeric,
  submitted_payment_count integer,
  verified_payment_amount numeric,
  refunded_payment_amount numeric,
  consumed_credit_units integer,
  refunded_credit_units integer,
  verified_revenue_amount numeric,
  reconciled_revenue_amount numeric,
  open_revenue_amount numeric,
  verified_expense_amount numeric,
  reconciled_expense_amount numeric,
  open_expense_amount numeric,
  recorded_net_amount numeric,
  direct_revenue_gap numeric,
  commercial_ready boolean,
  scope_confirmed boolean,
  ready boolean
)
language sql
security invoker
set search_path to ''
as $function$
  select * from private.ur_play_finance_snapshot(target_session);
$function$;

revoke all on function public.get_ur_play_finance_snapshot(uuid) from public, anon;
grant execute on function public.get_ur_play_finance_snapshot(uuid) to authenticated, service_role;

create or replace function private.refresh_ur_play_finance_task(target_session uuid)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_finance record;
begin
  perform private.ensure_ur_play_post_session_tasks(target_session);
  select * into v_finance from private.ur_play_finance_snapshot(target_session);

  update public.ur_play_post_session_tasks
  set
    managed_by='system',
    status=case when v_finance.ready then 'completed' else 'pending' end,
    evidence=jsonb_build_object(
      'confirmed_registrations',v_finance.confirmed_registrations,
      'attended_registrations',v_finance.attended_registrations,
      'pending_registration_payments',v_finance.pending_registration_payments,
      'paid_registrations',v_finance.paid_registrations,
      'not_required_registrations',v_finance.not_required_registrations,
      'waived_registrations',v_finance.waived_registrations,
      'refunded_registrations',v_finance.refunded_registrations,
      'declared_paid_amount',v_finance.declared_paid_amount,
      'charge_count',v_finance.charge_count,
      'open_charge_count',v_finance.open_charge_count,
      'verified_charge_amount',v_finance.verified_charge_amount,
      'waived_charge_amount',v_finance.waived_charge_amount,
      'refunded_charge_amount',v_finance.refunded_charge_amount,
      'submitted_payment_count',v_finance.submitted_payment_count,
      'verified_payment_amount',v_finance.verified_payment_amount,
      'refunded_payment_amount',v_finance.refunded_payment_amount,
      'consumed_credit_units',v_finance.consumed_credit_units,
      'refunded_credit_units',v_finance.refunded_credit_units,
      'verified_revenue_amount',v_finance.verified_revenue_amount,
      'reconciled_revenue_amount',v_finance.reconciled_revenue_amount,
      'open_revenue_amount',v_finance.open_revenue_amount,
      'verified_expense_amount',v_finance.verified_expense_amount,
      'reconciled_expense_amount',v_finance.reconciled_expense_amount,
      'open_expense_amount',v_finance.open_expense_amount,
      'recorded_net_amount',v_finance.recorded_net_amount,
      'direct_revenue_gap',v_finance.direct_revenue_gap,
      'commercial_ready',v_finance.commercial_ready,
      'scope_confirmed',v_finance.scope_confirmed,
      'ready',v_finance.ready,
      'verified_at',now()
    ),
    completed_at=case when v_finance.ready then coalesce(completed_at,now()) else null end,
    completed_by=case when v_finance.ready then coalesce(completed_by,auth.uid()) else null end,
    updated_at=now()
  where session_id=target_session and task_key='finance';
end;
$function$;

revoke all on function private.refresh_ur_play_finance_task(uuid) from public, anon, authenticated;
grant execute on function private.refresh_ur_play_finance_task(uuid) to service_role;

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
    (target_session,'finance','pending','system',true,v_base+interval '24 hours'),
    (target_session,'incidents','pending','human',true,v_base+interval '24 hours'),
    (target_session,'development','pending','human',true,v_base+interval '24 hours'),
    (target_session,'media','pending','human',true,v_base+interval '48 hours'),
    (target_session,'retention','pending','human',true,v_base+interval '48 hours'),
    (target_session,'feedback','pending','human',true,v_base+interval '48 hours'),
    (target_session,'report','pending','human',true,v_base+interval '48 hours')
  on conflict(session_id,task_key) do nothing;

  update public.ur_play_post_session_tasks
  set managed_by='system',updated_at=now()
  where session_id=target_session and task_key in ('ranking_data','ur_coins','finance') and managed_by<>'system';
end;
$function$;

revoke all on function private.ensure_ur_play_post_session_tasks(uuid) from public, anon, authenticated;
grant execute on function private.ensure_ur_play_post_session_tasks(uuid) to service_role;

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

revoke all on function private.confirm_ur_play_financial_scope(uuid,text) from public, anon;
grant execute on function private.confirm_ur_play_financial_scope(uuid,text) to authenticated, service_role;

create or replace function public.confirm_ur_play_financial_scope(
  target_session uuid,
  target_notes text default null
)
returns public.ur_play_financial_closeouts
language sql
security invoker
set search_path to ''
as $function$
  select private.confirm_ur_play_financial_scope(target_session,target_notes);
$function$;

revoke all on function public.confirm_ur_play_financial_scope(uuid,text) from public, anon;
grant execute on function public.confirm_ur_play_financial_scope(uuid,text) to authenticated, service_role;

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

revoke all on function private.reopen_ur_play_financial_scope(uuid,text) from public, anon;
grant execute on function private.reopen_ur_play_financial_scope(uuid,text) to authenticated, service_role;

create or replace function public.reopen_ur_play_financial_scope(target_session uuid,target_reason text)
returns public.ur_play_financial_closeouts
language sql
security invoker
set search_path to ''
as $function$
  select private.reopen_ur_play_financial_scope(target_session,target_reason);
$function$;

revoke all on function public.reopen_ur_play_financial_scope(uuid,text) from public, anon;
grant execute on function public.reopen_ur_play_financial_scope(uuid,text) to authenticated, service_role;

create or replace function private.admin_refresh_ur_play_post_session(target_session uuid)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not private.operates_ur_play_session(target_session) then
    raise exception 'SESSION_OPERATION_DENIED' using errcode='42501';
  end if;
  if exists (
    select 1 from public.ur_play_post_session_closures c
    where c.session_id=target_session and c.status='closed'
  ) then
    raise exception 'POST_SESSION_ALREADY_CLOSED' using errcode='23514';
  end if;
  perform private.refresh_ur_play_post_session_automatic_tasks(target_session);
  perform private.refresh_ur_play_finance_task(target_session);
end;
$function$;

revoke all on function private.admin_refresh_ur_play_post_session(uuid) from public, anon;
grant execute on function private.admin_refresh_ur_play_post_session(uuid) to authenticated, service_role;

create or replace function private.seed_ur_play_finance_on_completion()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
begin
  if new.status='completed' and old.status is distinct from new.status then
    perform private.refresh_ur_play_finance_task(new.id);
  end if;
  return new;
end;
$function$;

revoke all on function private.seed_ur_play_finance_on_completion() from public, anon, authenticated;

drop trigger if exists zz_ur_play_session_seed_finance on public.ur_play_sessions;
create trigger zz_ur_play_session_seed_finance
after update of status on public.ur_play_sessions
for each row
execute function private.seed_ur_play_finance_on_completion();

create or replace function private.guard_post_session_finance_before_close()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_status text;
begin
  if new.status='closed' then
    perform private.refresh_ur_play_finance_task(new.session_id);
    select status into v_status
    from public.ur_play_post_session_tasks
    where session_id=new.session_id and task_key='finance';
    if v_status is distinct from 'completed' then
      raise exception 'FINANCE_NOT_READY' using errcode='23514';
    end if;
  end if;
  return new;
end;
$function$;

revoke all on function private.guard_post_session_finance_before_close() from public, anon, authenticated;

drop trigger if exists ur_play_post_session_finance_guard on public.ur_play_post_session_closures;
create trigger ur_play_post_session_finance_guard
before insert or update of status on public.ur_play_post_session_closures
for each row
execute function private.guard_post_session_finance_before_close();

update public.ur_play_post_session_tasks
set managed_by='system',updated_at=now()
where task_key='finance' and managed_by<>'system';
