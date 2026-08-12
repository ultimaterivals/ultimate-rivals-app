create table public.athlete_feedback_cases (
  id uuid primary key default gen_random_uuid(),
  protocol text not null unique,
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  category text not null check (
    category in ('app','game','refereeing','arena','team','suggestion','financial','other')
  ),
  message text not null check (char_length(trim(message)) between 10 and 2000),
  status text not null default 'open' check (status in ('open','in_review','resolved')),
  handled_by uuid references public.profiles(id) on delete set null,
  handled_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint athlete_feedback_cases_resolution_check check (
    status <> 'resolved' or (handled_by is not null and handled_at is not null)
  )
);

create index athlete_feedback_cases_queue_idx
  on public.athlete_feedback_cases(status, created_at desc);
create index athlete_feedback_cases_athlete_idx
  on public.athlete_feedback_cases(athlete_id, created_at desc);

create trigger athlete_feedback_cases_set_updated_at
before update on public.athlete_feedback_cases
for each row execute function private.set_updated_at();

alter table public.athlete_feedback_cases enable row level security;
revoke all on table public.athlete_feedback_cases from public, anon;
grant select on table public.athlete_feedback_cases to authenticated, service_role;

create policy athlete_feedback_cases_select
on public.athlete_feedback_cases
for select to authenticated
using (
  athlete_id = (select private.current_athlete_id())
  or (select private.has_any_role(array['admin','operator']::public.app_role[]))
);

create or replace function public.submit_my_athlete_feedback_case(
  target_category text,
  target_message text
)
returns table(protocol text)
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_athlete uuid := private.current_athlete_id();
  v_protocol text;
  v_case_id uuid;
begin
  if v_athlete is null then
    raise exception 'ATHLETE_FEEDBACK_SUBMISSION_DENIED' using errcode = '42501';
  end if;
  if target_category not in ('app','game','refereeing','arena','team','suggestion','financial','other') then
    raise exception 'INVALID_ATHLETE_FEEDBACK_CATEGORY' using errcode = '23514';
  end if;
  if char_length(trim(coalesce(target_message, ''))) not between 10 and 2000 then
    raise exception 'INVALID_ATHLETE_FEEDBACK_MESSAGE' using errcode = '23514';
  end if;

  loop
    v_protocol := 'URF-' || to_char(current_date, 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    begin
      insert into public.athlete_feedback_cases(protocol, athlete_id, category, message)
      values (v_protocol, v_athlete, target_category, trim(target_message))
      returning id into v_case_id;
      exit;
    exception when unique_violation then
      null;
    end;
  end loop;

  insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, after_data, metadata)
  values (
    auth.uid(),
    'athlete_feedback_case.submitted',
    'athlete_feedback_case',
    v_case_id,
    jsonb_build_object('protocol', v_protocol, 'category', target_category),
    jsonb_build_object('athlete_id', v_athlete)
  );

  return query select v_protocol;
end;
$function$;

revoke all on function public.submit_my_athlete_feedback_case(text,text) from public, anon;
grant execute on function public.submit_my_athlete_feedback_case(text,text) to authenticated;

create or replace function public.update_athlete_feedback_case(
  target_case uuid,
  target_status text,
  target_resolution_note text default null
)
returns public.athlete_feedback_cases
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_actor uuid := private.require_admin_actor();
  v_case public.athlete_feedback_cases;
begin
  if target_status not in ('open','in_review','resolved') then
    raise exception 'INVALID_ATHLETE_FEEDBACK_STATUS' using errcode = '23514';
  end if;
  if target_status = 'resolved' and char_length(trim(coalesce(target_resolution_note, ''))) < 3 then
    raise exception 'ATHLETE_FEEDBACK_RESOLUTION_REQUIRED' using errcode = '23514';
  end if;

  select * into v_case from public.athlete_feedback_cases where id = target_case for update;
  if not found then raise exception 'ATHLETE_FEEDBACK_CASE_NOT_FOUND' using errcode = 'P0002'; end if;

  update public.athlete_feedback_cases
  set
    status = target_status,
    handled_by = case when target_status = 'open' then null else v_actor end,
    handled_at = case when target_status = 'open' then null else now() end,
    resolution_note = case when target_status = 'resolved' then trim(target_resolution_note) else null end
  where id = target_case
  returning * into v_case;

  insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, after_data)
  values (
    v_actor,
    'athlete_feedback_case.' || target_status,
    'athlete_feedback_case',
    v_case.id,
    jsonb_build_object('protocol', v_case.protocol, 'status', v_case.status)
  );
  return v_case;
end;
$function$;

revoke all on function public.update_athlete_feedback_case(uuid,text,text) from public, anon;
grant execute on function public.update_athlete_feedback_case(uuid,text,text) to authenticated;
