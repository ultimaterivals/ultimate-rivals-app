drop policy if exists athletes_self_update on public.athletes;

create or replace function private.update_own_athlete_matchmaking_identity(
  target_gender public.gender_type
)
returns public.athletes
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  athlete_row public.athletes;
begin
  if actor_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select *
  into athlete_row
  from public.athletes
  where profile_id = actor_id
  for update;

  if not found then
    raise exception 'athlete profile not linked' using errcode = 'P0002';
  end if;

  update public.athletes
  set gender = target_gender,
      updated_at = now()
  where id = athlete_row.id
  returning * into athlete_row;

  return athlete_row;
end;
$$;

create or replace function public.update_own_athlete_matchmaking_identity(
  target_gender public.gender_type
)
returns public.athletes
language sql
set search_path = ''
as $$
  select private.update_own_athlete_matchmaking_identity(target_gender)
$$;

revoke all on function private.update_own_athlete_matchmaking_identity(public.gender_type)
  from public, anon, authenticated;
revoke all on function public.update_own_athlete_matchmaking_identity(public.gender_type)
  from public, anon;
grant execute on function public.update_own_athlete_matchmaking_identity(public.gender_type)
  to authenticated;

comment on function public.update_own_athlete_matchmaking_identity(public.gender_type) is
  'Allows an authenticated athlete to confirm only their own gender used by category matchmaking. Institutional athlete fields remain protected by RLS.';
