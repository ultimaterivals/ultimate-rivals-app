-- Athlete identity, canonical avatar privacy, visual ranking enrichment and
-- first-party engagement tracking. Additive only; do not apply to PROD before
-- release gates are completed.

alter table public.athletes
  add column if not exists avatar_storage_path text,
  add column if not exists avatar_content_type text,
  add column if not exists avatar_file_size_bytes integer,
  add column if not exists avatar_updated_at timestamptz,
  add column if not exists show_profile_photo_publicly boolean not null default false;

alter table public.athletes
  add constraint athletes_avatar_storage_path_safe
  check (
    avatar_storage_path is null
    or avatar_storage_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f-]{36}\\.webp$'
  );

alter table public.athletes
  add constraint athletes_avatar_content_type_safe
  check (
    avatar_content_type is null
    or avatar_content_type in ('image/jpeg','image/png','image/webp','image/webp-normalized')
  );

alter table public.athletes
  add constraint athletes_avatar_file_size_safe
  check (
    avatar_file_size_bytes is null
    or avatar_file_size_bytes between 1 and 5242880
  );

create index if not exists athletes_public_photo_idx
  on public.athletes(id)
  where avatar_url is not null
    and show_profile_photo_publicly
    and public_profile_visibility = 'sports_public';

alter table public.athlete_public_profiles
  add column if not exists show_profile_photo_publicly boolean not null default false;

create or replace function private.sync_athlete_public_profile()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='DELETE' then
    delete from public.athlete_public_profiles where athlete_id=old.id;
    return old;
  end if;

  insert into public.athlete_public_profiles(
    athlete_id,
    athlete_code,
    public_name,
    avatar_url,
    show_profile_photo_publicly,
    updated_at
  )
  values(
    new.id,
    new.athlete_code,
    new.public_name,
    case
      when new.show_profile_photo_publicly
       and new.public_profile_visibility = 'sports_public'
      then new.avatar_url
      else null
    end,
    new.show_profile_photo_publicly,
    now()
  )
  on conflict(athlete_id) do update set
    athlete_code=excluded.athlete_code,
    public_name=excluded.public_name,
    avatar_url=excluded.avatar_url,
    show_profile_photo_publicly=excluded.show_profile_photo_publicly,
    updated_at=now();
  return new;
end $$;

create or replace view public.public_rankings as
select
  re.id,
  re.ranking_type,
  re.season_id,
  re.cycle_id,
  re.entity_id,
  re.entity_code,
  re.display_name,
  re.level,
  re.team_id,
  re.team_name,
  re.pole_id,
  re.pole_name,
  re.category_code,
  re.format_code,
  re.total_points,
  re.games_played,
  re.wins,
  re.losses,
  re.win_rate,
  re.aces,
  re.attacks,
  re.blocks,
  re.defenses,
  re.assists,
  re.athletes_contributing,
  re.teams_contributing,
  re.current_position,
  re.general_position,
  re.previous_position,
  re.position_change,
  re.movement,
  re.refreshed_at,
  case
    when re.ranking_type = 'individual'
     and a.show_profile_photo_publicly
     and a.public_profile_visibility = 'sports_public'
    then a.avatar_url
    else null
  end as avatar_url
from public.ranking_entries re
left join public.athletes a
  on a.id = re.entity_id
 and re.ranking_type = 'individual';

create or replace view public.interest_list_sanitized
with (security_invoker = true)
as
select
  si.opportunity_id,
  case
    when si.show_identity and a.show_in_interest_lists and a.public_profile_visibility = 'sports_public'
      then a.id
    else null
  end as athlete_id,
  case
    when si.show_identity and a.show_in_interest_lists and a.public_profile_visibility = 'sports_public'
      then a.public_name
    else null
  end as display_name,
  case
    when si.show_identity and a.show_in_interest_lists and a.public_profile_visibility = 'sports_public'
      then a.athlete_code
    else null
  end as athlete_code,
  case
    when si.show_identity
     and a.show_in_interest_lists
     and a.public_profile_visibility = 'sports_public'
     and a.show_profile_photo_publicly
      then a.avatar_url
    else null
  end as avatar_public,
  al.level,
  p.name as primary_pole,
  t.name as team_name,
  si.interest_mode,
  si.status,
  not (si.show_identity and a.show_in_interest_lists and a.public_profile_visibility = 'sports_public') as aggregate_only
from public.session_interests si
join public.athletes a on a.id = si.athlete_id
left join public.athlete_levels al on al.athlete_id = a.id and al.status = 'active'
left join public.poles p on p.id = a.primary_pole_id
left join public.team_memberships tm on tm.athlete_id = a.id and tm.status = 'active'
left join public.teams t on t.id = tm.team_id
where si.status = 'active';

drop policy if exists athlete_avatar_select on storage.objects;
drop policy if exists athlete_avatar_public_select on storage.objects;
drop policy if exists athlete_avatar_insert on storage.objects;
drop policy if exists athlete_avatar_update on storage.objects;
drop policy if exists athlete_avatar_delete on storage.objects;

create policy athlete_avatar_select on storage.objects for select to authenticated using (
  bucket_id='athlete-avatars' and (
    (storage.foldername(name))[1] = (select private.current_athlete_id())::text
    or (select private.has_any_role(array['admin']::public.app_role[]))
    or exists (
      select 1 from public.athletes a
      where a.id::text = (storage.foldername(name))[1]
        and a.avatar_url = name
        and a.show_profile_photo_publicly
        and a.public_profile_visibility = 'sports_public'
    )
  )
);

create policy athlete_avatar_public_select on storage.objects for select to anon using (
  bucket_id='athlete-avatars'
  and exists (
    select 1 from public.athletes a
    where a.id::text = (storage.foldername(name))[1]
      and a.avatar_url = name
      and a.show_profile_photo_publicly
      and a.public_profile_visibility = 'sports_public'
  )
);

create policy athlete_avatar_insert on storage.objects for insert to authenticated with check (
  bucket_id='athlete-avatars'
  and (
    (storage.foldername(name))[1] = (select private.current_athlete_id())::text
    or (select private.has_any_role(array['admin']::public.app_role[]))
  )
  and lower(name) ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\\.(webp|png|jpe?g)$'
);

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
  and lower(name) ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\\.webp$'
);

create policy athlete_avatar_delete on storage.objects for delete to authenticated using (
  bucket_id='athlete-avatars'
  and (
    (storage.foldername(name))[1] = (select private.current_athlete_id())::text
    or (select private.has_any_role(array['admin']::public.app_role[]))
  )
);

alter table public.acquisition_events
  drop constraint if exists acquisition_events_event_name_check;

alter table public.acquisition_events
  add constraint acquisition_events_event_name_check check (event_name in (
    'app_open','landing_view','signup_started','signup_completed','profile_completed','calendar_view','activity_view',
    'interest_created','interest_cancelled','formation_proposed','formation_ready','reservation_started','reservation_completed',
    'reservation_cancelled','waitlist_joined','payment_submitted','payment_verified','check_in','ur_play_participated',
    'training_interest_created','training_participated','competition_view','competition_registration','market_view',
    'market_redemption','first_participation','second_participation','return_participation',
    'athlete_home_viewed','season_hub_viewed','next_action_viewed','next_action_clicked',
    'calendar_viewed','calendar_filter_changed','activity_viewed',
    'interest_started','interest_completed','interest_cancelled',
    'reservation_started','reservation_completed','reservation_waitlisted','reservation_cancelled',
    'formation_viewed','formation_action_clicked','competition_viewed','competition_interest_registered',
    'season_stage_viewed','notification_opened',
    'athlete_profile_viewed','athlete_photo_upload_started','athlete_photo_upload_completed','athlete_photo_upload_failed',
    'athlete_photo_updated','athlete_photo_removed','athlete_photo_visibility_changed',
    'ranking_viewed','ranking_podium_viewed','ranking_athlete_clicked','ranking_own_position_viewed','ranking_filter_changed'
  ));
