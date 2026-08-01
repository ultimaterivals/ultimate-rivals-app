alter type public.athlete_status add value if not exists 'suspended';

create sequence if not exists public.athlete_code_seq;

alter table public.athletes
  add column athlete_code text,
  add column phone text check (phone is null or char_length(phone) between 8 and 24),
  add column email_contact text check (email_contact is null or char_length(email_contact) <= 254),
  add column instagram_handle text check (instagram_handle is null or instagram_handle ~ '^@?[A-Za-z0-9._]{1,30}$'),
  add column city text check (city is null or char_length(city) <= 100),
  add column state text check (state is null or state ~ '^[A-Z]{2}$'),
  add column avatar_url text,
  add column emergency_contact_name text check (emergency_contact_name is null or char_length(emergency_contact_name) <= 120),
  add column emergency_contact_phone text check (emergency_contact_phone is null or char_length(emergency_contact_phone) between 8 and 24),
  add column normalized_full_name text,
  add column duplicate_override_reason text check (duplicate_override_reason is null or char_length(duplicate_override_reason) between 10 and 500);
alter sequence public.athlete_code_seq owned by public.athletes.athlete_code;

create or replace function private.normalize_athlete_name(value text)
returns text language sql immutable security invoker set search_path = '' as $$
  select lower(regexp_replace(trim(value), '[^[:alnum:]]+', ' ', 'g'))
$$;

create or replace function private.prepare_athlete_identity()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.athlete_code is distinct from old.athlete_code then
    raise exception 'athlete_code is immutable' using errcode = '23514';
  end if;
  if new.athlete_code is null then
    new.athlete_code := 'UR-' || lpad(nextval('public.athlete_code_seq')::text, 6, '0');
  end if;
  new.normalized_full_name := private.normalize_athlete_name(new.full_name);
  new.email_contact := nullif(lower(trim(new.email_contact)), '');
  return new;
end $$;

create trigger athletes_prepare_identity before insert or update on public.athletes
for each row execute function private.prepare_athlete_identity();

update public.athletes set athlete_code = null, full_name = full_name;
alter table public.athletes alter column athlete_code set not null;
alter table public.athletes add constraint athletes_code_format check (athlete_code ~ '^UR-[0-9]{6}$');
alter table public.athletes add constraint athletes_code_unique unique (athlete_code);

create type public.athlete_note_type as enum ('general','operational','technical');
create type public.athlete_note_visibility as enum ('internal','athlete_visible');
create table public.athlete_notes (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  author_user_id uuid not null references public.profiles(id) on delete restrict,
  note_type public.athlete_note_type not null,
  content text not null check (char_length(trim(content)) between 2 and 2000),
  visibility public.athlete_note_visibility not null default 'internal',
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  archived_at timestamptz
);
create index athlete_notes_athlete_created_idx on public.athlete_notes(athlete_id, created_at desc);
create trigger athlete_notes_audit after insert or update or delete on public.athlete_notes
for each row execute function private.capture_audit_log();

alter table public.athlete_notes enable row level security;
alter table public.athlete_notes force row level security;
create policy athlete_notes_admin_all on public.athlete_notes for all to authenticated
using ((select private.has_any_role(array['admin']::public.app_role[])))
with check ((select private.has_any_role(array['admin']::public.app_role[])) and author_user_id = (select auth.uid()));
create policy athlete_notes_operator_select on public.athlete_notes for select to authenticated
using ((select private.has_any_role(array['operator']::public.app_role[])));
create policy athlete_notes_own_visible_select on public.athlete_notes for select to authenticated
using (visibility = 'athlete_visible' and athlete_id = (select private.current_athlete_id()));
revoke all on public.athlete_notes from anon, authenticated;
grant select, insert, update, delete on public.athlete_notes to authenticated;
grant all on public.athlete_notes to service_role;

create or replace function private.protect_athlete_self_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if private.current_app_role() = 'athlete' and (
    new.profile_id is distinct from old.profile_id or new.full_name is distinct from old.full_name or
    new.birth_date is distinct from old.birth_date or new.gender is distinct from old.gender or
    new.status is distinct from old.status or new.archived_at is distinct from old.archived_at or
    new.emergency_contact_name is distinct from old.emergency_contact_name or
    new.emergency_contact_phone is distinct from old.emergency_contact_phone or
    new.duplicate_override_reason is distinct from old.duplicate_override_reason
  ) then raise exception 'restricted athlete field' using errcode = '42501'; end if;
  return new;
end $$;
revoke all on function private.protect_athlete_self_update() from public, anon, authenticated;
create trigger athletes_protect_self_update before update on public.athletes
for each row execute function private.protect_athlete_self_update();

create policy athletes_self_update on public.athletes for update to authenticated
using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

create or replace function public.assign_athlete_level(
  target_athlete_id uuid, target_season_id uuid, target_level public.athlete_level,
  effective_at timestamptz, assignment_reason text default null
) returns public.athlete_levels language plpgsql security invoker set search_path = '' as $$
declare result public.athlete_levels;
begin
  if not private.has_any_role(array['admin']::public.app_role[]) then raise exception 'forbidden' using errcode='42501'; end if;
  update public.athlete_levels set ends_at = effective_at, status = 'inactive'
    where athlete_id = target_athlete_id and season_id = target_season_id
      and status = 'active' and starts_at < effective_at;
  insert into public.athlete_levels(athlete_id,season_id,level,starts_at,reason,assigned_by)
    values(target_athlete_id,target_season_id,target_level,effective_at,assignment_reason,auth.uid()) returning * into result;
  return result;
end $$;
revoke all on function public.assign_athlete_level(uuid,uuid,public.athlete_level,timestamptz,text) from public, anon;
grant execute on function public.assign_athlete_level(uuid,uuid,public.athlete_level,timestamptz,text) to authenticated;

create index athletes_search_idx on public.athletes(normalized_full_name, athlete_code);
create index athletes_email_idx on public.athletes(lower(email_contact)) where email_contact is not null;
create index athletes_phone_idx on public.athletes(phone) where phone is not null;
create index athletes_birth_name_idx on public.athletes(normalized_full_name,birth_date) where birth_date is not null;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('athlete-avatars','athlete-avatars',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy athlete_avatar_select on storage.objects for select to authenticated using (
  bucket_id='athlete-avatars' and (
    (storage.foldername(name))[1] = (select private.current_athlete_id())::text
    or (select private.has_any_role(array['admin']::public.app_role[]))
  )
);
create policy athlete_avatar_insert on storage.objects for insert to authenticated with check (
  bucket_id='athlete-avatars' and (storage.foldername(name))[1] = (select private.current_athlete_id())::text
  and owner_id = (select auth.uid())::text
);
create policy athlete_avatar_update on storage.objects for update to authenticated using (
  bucket_id='athlete-avatars' and ((storage.foldername(name))[1] = (select private.current_athlete_id())::text or (select private.has_any_role(array['admin']::public.app_role[])))
) with check (bucket_id='athlete-avatars');
create policy athlete_avatar_delete on storage.objects for delete to authenticated using (
  bucket_id='athlete-avatars' and ((storage.foldername(name))[1] = (select private.current_athlete_id())::text or (select private.has_any_role(array['admin']::public.app_role[])))
);
