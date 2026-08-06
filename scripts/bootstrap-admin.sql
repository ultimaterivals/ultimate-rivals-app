-- Bootstrap the first Ultimate Rivals admin in a freshly provisioned PROD project.
--
-- Run only from a trusted administrative SQL session after:
-- 1. verifying the Supabase project ref/name;
-- 2. creating and confirming the user in Supabase Auth;
-- 3. taking a pre-change backup/snapshot.
--
-- Required psql variables:
--   auth_user_id   UUID of the existing auth.users row
--   display_name   Human-readable admin display name
--   operator_note  Change ticket / operator note, no secrets
--
-- Example:
-- psql "$DATABASE_URL" \
--   -v auth_user_id='00000000-0000-0000-0000-000000000000' \
--   -v display_name='First Admin' \
--   -v operator_note='PROD bootstrap approved in ticket XYZ' \
--   -f scripts/bootstrap-admin.sql

\set ON_ERROR_STOP on

begin;

create temp table _bootstrap_admin_input as
select
  :'auth_user_id'::uuid as target_user,
  :'display_name'::text as target_display_name,
  :'operator_note'::text as note;

do $$
declare
  target_user uuid;
  target_display_name text;
  note text;
begin
  select input.target_user, input.target_display_name, input.note
  into target_user, target_display_name, note
  from _bootstrap_admin_input as input;

  if target_display_name is null or length(trim(target_display_name)) < 2 then
    raise exception 'display_name must be provided';
  end if;

  if note is null or length(trim(note)) < 8 then
    raise exception 'operator_note must document the approval/change record';
  end if;

  if not exists (select 1 from auth.users where id = target_user) then
    raise exception 'auth user % does not exist', target_user;
  end if;

  insert into public.profiles (id, display_name, role, status)
  values (target_user, target_display_name, 'admin', 'active')
  on conflict (id) do update
    set display_name = excluded.display_name,
        role = 'admin',
        status = 'active',
        updated_at = now();

  insert into public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    before_data,
    after_data,
    metadata
  )
  values (
    null,
    'bootstrap_admin',
    'profiles',
    target_user,
    null,
    jsonb_build_object('id', target_user, 'role', 'admin', 'status', 'active'),
    jsonb_build_object('operator_note', note, 'source', 'scripts/bootstrap-admin.sql')
  );
end $$;

commit;

select id, display_name, role, status
from public.profiles
where id = :'auth_user_id'::uuid
  and role = 'admin'
  and status = 'active';
