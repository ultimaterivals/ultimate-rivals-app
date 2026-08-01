create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  request_id text
);

create or replace function private.capture_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous jsonb;
  current jsonb;
  record_id uuid;
  headers jsonb;
begin
  previous := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  current := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  record_id := coalesce((current ->> 'id')::uuid, (previous ->> 'id')::uuid);
  headers := nullif(current_setting('request.headers', true), '')::jsonb;

  insert into public.audit_logs (
    actor_user_id, action, entity_type, entity_id,
    before_data, after_data, metadata, request_id
  ) values (
    (select auth.uid()), lower(tg_op), tg_table_name, record_id,
    previous, current,
    jsonb_build_object('schema', tg_table_schema, 'transaction_id', txid_current()),
    headers ->> 'x-request-id'
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.capture_audit_log() from public, anon, authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles', 'athletes', 'seasons', 'poles', 'teams',
    'access_assignments', 'team_memberships', 'athlete_levels',
    'team_rosters', 'team_roster_members'
  ]
  loop
    execute format(
      'create trigger %I_audit after insert or update or delete on public.%I for each row execute function private.capture_audit_log()',
      table_name, table_name
    );
  end loop;
end $$;
