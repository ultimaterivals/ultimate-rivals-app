-- Keep public_rankings invoker-safe while allowing its privacy-gated avatar join.
-- No athlete private columns are granted to anon.

grant select (id, avatar_url, show_profile_photo_publicly, public_profile_visibility)
on public.athletes to anon;

drop policy if exists athletes_public_ranking_avatar_read on public.athletes;
create policy athletes_public_ranking_avatar_read
on public.athletes
for select
to anon
using (public_profile_visibility = 'sports_public');
