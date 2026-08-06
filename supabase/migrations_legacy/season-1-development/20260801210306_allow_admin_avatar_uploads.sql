drop policy athlete_avatar_insert on storage.objects;
create policy athlete_avatar_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'athlete-avatars' and (
    (select private.has_any_role(array['admin']::public.app_role[]))
    or (
      (storage.foldername(name))[1] = (select private.current_athlete_id())::text
      and owner_id = (select auth.uid())::text
    )
  )
);
