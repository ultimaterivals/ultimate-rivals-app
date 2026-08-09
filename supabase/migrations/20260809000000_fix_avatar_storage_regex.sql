-- Correct the literal-dot regex used by the avatar storage constraint and
-- policies. The feature migration has already been shared, so keep this fix
-- forward-only for every existing database.

alter table public.athletes
  drop constraint if exists athletes_avatar_storage_path_safe;

alter table public.athletes
  add constraint athletes_avatar_storage_path_safe
  check (
    avatar_storage_path is null
    or avatar_storage_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f-]{36}[.]webp$'
  );

drop policy if exists athlete_avatar_insert on storage.objects;

create policy athlete_avatar_insert on storage.objects for insert to authenticated with check (
  bucket_id='athlete-avatars'
  and (
    (storage.foldername(name))[1] = (select private.current_athlete_id())::text
    or (select private.has_any_role(array['admin']::public.app_role[]))
  )
  and lower(name) ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}[.](webp|png|jpe?g)$'
);

drop policy if exists athlete_avatar_update on storage.objects;

create policy athlete_avatar_update on storage.objects for update to authenticated using (
  bucket_id='athlete-avatars'
  and (
    (storage.foldername(name))[1] = (select private.current_athlete_id())::text
    or (select private.has_any_role(array['admin']::public.app_role[]))
  )
) with check (
  bucket_id='athlete-avatars'
  and (
    (storage.foldername(name))[1] = (select private.current_athlete_id())::text
    or (select private.has_any_role(array['admin']::public.app_role[]))
  )
  and lower(name) ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}[.]webp$'
);
