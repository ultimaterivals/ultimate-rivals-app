alter view public.public_rankings set (security_invoker = true);

grant select (id, show_profile_photo_publicly, public_profile_visibility, avatar_url)
  on table public.athletes
  to anon;

drop policy if exists athletes_public_profile_photo_read on public.athletes;
create policy athletes_public_profile_photo_read
  on public.athletes
  for select
  to anon
  using (
    show_profile_photo_publicly = true
    and public_profile_visibility = 'sports_public'
  );
