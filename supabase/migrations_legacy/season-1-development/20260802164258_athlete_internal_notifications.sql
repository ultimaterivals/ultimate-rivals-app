create type public.athlete_notification_type as enum (
  'registration_confirmed',
  'waitlist_promoted',
  'match_called',
  'match_result_homologated',
  'ranking_movement',
  'assessment_available',
  'level_changed',
  'team_membership_changed'
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  notification_type public.athlete_notification_type not null,
  title text not null check (char_length(trim(title)) between 2 and 120),
  body text not null check (char_length(trim(body)) between 2 and 500),
  action_href text not null check (action_href ~ '^/athlete(?:/|$)'),
  source_type text not null check (source_type ~ '^[a-z][a-z0-9_]{1,63}$'),
  source_id uuid,
  idempotency_key text not null unique check (char_length(idempotency_key) between 3 and 200),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  occurred_at timestamptz not null default now(),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (read_at is null or read_at >= created_at)
);

create index notifications_athlete_timeline
on public.notifications(athlete_id, occurred_at desc, id desc);

create index notifications_athlete_unread
on public.notifications(athlete_id, occurred_at desc)
where read_at is null;

create index notifications_source
on public.notifications(source_type, source_id)
where source_id is not null;

create or replace function private.enqueue_athlete_notification(
  target_athlete uuid,
  target_type public.athlete_notification_type,
  target_title text,
  target_body text,
  target_href text,
  target_source_type text,
  target_source_id uuid,
  target_idempotency_key text,
  target_metadata jsonb default '{}'::jsonb,
  target_occurred_at timestamptz default now()
) returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications(
    athlete_id, notification_type, title, body, action_href,
    source_type, source_id, idempotency_key, metadata, occurred_at
  )
  values (
    target_athlete, target_type, target_title, target_body, target_href,
    target_source_type, target_source_id, target_idempotency_key,
    coalesce(target_metadata, '{}'::jsonb), coalesce(target_occurred_at, now())
  )
  on conflict (idempotency_key) do nothing
$$;

revoke all on function private.enqueue_athlete_notification(
  uuid, public.athlete_notification_type, text, text, text, text, uuid, text, jsonb, timestamptz
) from public, anon, authenticated;

create or replace function private.notify_ur_play_registration()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  kind public.athlete_notification_type;
begin
  if new.registration_status <> 'confirmed'
    or (tg_op = 'UPDATE' and old.registration_status = new.registration_status) then
    return new;
  end if;

  kind := case
    when tg_op = 'UPDATE' and old.registration_status = 'waitlisted'
      then 'waitlist_promoted'::public.athlete_notification_type
    else 'registration_confirmed'::public.athlete_notification_type
  end;

  perform private.enqueue_athlete_notification(
    new.athlete_id,
    kind,
    case when kind = 'waitlist_promoted' then 'VocÃª saiu da lista de espera' else 'InscriÃ§Ã£o confirmada' end,
    case when kind = 'waitlist_promoted' then 'Sua vaga no prÃ³ximo UR Play foi confirmada.' else 'Sua presenÃ§a no UR Play estÃ¡ confirmada.' end,
    '/athlete/ur-play/' || new.session_id,
    'ur_play_registration',
    new.id,
    kind::text || ':' || new.id,
    jsonb_build_object('session_id', new.session_id),
    coalesce(new.confirmed_at, new.updated_at, now())
  );
  return new;
end
$$;

create trigger ur_play_registrations_athlete_notification
after insert or update of registration_status on public.ur_play_registrations
for each row execute function private.notify_ur_play_registration();

create or replace function private.notify_match_called()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  athlete uuid;
begin
  if new.status <> 'called' or old.status = 'called' then return new; end if;
  for athlete in
    select participant.athlete_id
    from public.match_participants participant
    where participant.match_id = new.id and participant.status = 'active'
    union
    select squad.athlete_id
    from public.match_squad_members squad
    where squad.match_id = new.id and squad.status = 'active'
  loop
    perform private.enqueue_athlete_notification(
      athlete, 'match_called', 'VocÃª foi chamado',
      'Sua partida estÃ¡ sendo preparada. Confira sua escalaÃ§Ã£o e a quadra.',
      '/athlete/matches/' || new.id, 'match', new.id,
      'match_called:' || new.id || ':' || athlete,
      jsonb_build_object('session_id', new.session_id, 'match_code', new.match_code),
      coalesce(new.called_at, now())
    );
  end loop;
  return new;
end
$$;

create trigger matches_athlete_notification
after update of status on public.matches
for each row execute function private.notify_match_called();

create or replace function private.notify_match_homologated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  athlete uuid;
begin
  if new.result_status <> 'homologated'
    or (tg_op = 'UPDATE' and old.result_status = new.result_status) then return new; end if;
  for athlete in
    select participant.athlete_id
    from public.match_participants participant
    where participant.match_id = new.match_id and participant.status = 'active'
  loop
    perform private.enqueue_athlete_notification(
      athlete, 'match_result_homologated', 'Resultado homologado',
      'O resultado e a pontuaÃ§Ã£o da sua partida jÃ¡ estÃ£o disponÃ­veis.',
      '/athlete/matches/' || new.match_id, 'match_result', new.id,
      'match_result_homologated:' || new.id || ':' || athlete,
      jsonb_build_object('match_id', new.match_id), coalesce(new.homologated_at, now())
    );
  end loop;
  return new;
end
$$;

create trigger match_results_athlete_notification
after insert or update of result_status on public.match_results
for each row execute function private.notify_match_homologated();

create or replace function private.notify_ranking_movement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.ranking_type <> 'individual' or new.cycle_id is not null
    or new.position_change is null or new.position_change = 0 then return new; end if;
  perform private.enqueue_athlete_notification(
    new.entity_id, 'ranking_movement',
    case when new.position_change > 0 then 'VocÃª subiu no ranking' else 'Seu ranking foi atualizado' end,
    case when new.position_change > 0
      then 'VocÃª ganhou ' || new.position_change || ' posiÃ§Ã£o(Ãµes) na classificaÃ§Ã£o.'
      else 'Sua nova posiÃ§Ã£o oficial Ã© #' || new.current_position || '.' end,
    '/athlete/ranking', 'ranking_entry', new.id,
    'ranking_movement:' || new.season_id || ':' || new.entity_id || ':' || new.refreshed_at,
    jsonb_build_object('position', new.current_position, 'change', new.position_change),
    new.refreshed_at
  );
  return new;
end
$$;

create trigger ranking_entries_athlete_notification
after insert on public.ranking_entries
for each row execute function private.notify_ranking_movement();

create or replace function private.notify_assessment_available()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not new.athlete_visible
    or (tg_op = 'UPDATE' and old.athlete_visible = new.athlete_visible) then return new; end if;
  perform private.enqueue_athlete_notification(
    new.athlete_id, 'assessment_available', 'Nova avaliaÃ§Ã£o disponÃ­vel',
    'A comissÃ£o tÃ©cnica liberou um novo feedback para sua jornada.',
    '/athlete/development', 'athlete_assessment', new.id,
    'assessment_available:' || new.id, '{}'::jsonb, coalesce(new.assessed_at, now())
  );
  return new;
end
$$;

create trigger athlete_assessments_notification
after insert or update of athlete_visible on public.athlete_assessments
for each row execute function private.notify_assessment_available();

create or replace function private.notify_level_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'active'
    or (tg_op = 'UPDATE' and old.status = new.status and old.level = new.level) then return new; end if;
  perform private.enqueue_athlete_notification(
    new.athlete_id, 'level_changed', 'Seu nÃ­vel foi atualizado',
    'Sua jornada esportiva agora registra o nÃ­vel ' || upper(new.level::text) || '.',
    '/athlete/journey', 'athlete_level', new.id,
    'level_changed:' || new.id || ':' || new.level, jsonb_build_object('level', new.level), new.starts_at
  );
  return new;
end
$$;

create trigger athlete_levels_notification
after insert or update of status, level on public.athlete_levels
for each row execute function private.notify_level_changed();

create or replace function private.notify_team_membership_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.status = new.status and old.team_id = new.team_id then return new; end if;
  perform private.enqueue_athlete_notification(
    new.athlete_id, 'team_membership_changed', 'Seu vÃ­nculo de equipe mudou',
    case when new.status = 'active' then 'Sua nova equipe jÃ¡ aparece no portal do atleta.' else 'Seu vÃ­nculo de equipe foi atualizado.' end,
    '/athlete/profile', 'team_membership', new.id,
    'team_membership_changed:' || new.id || ':' || new.status,
    jsonb_build_object('team_id', new.team_id, 'status', new.status), coalesce(new.starts_at, now())
  );
  return new;
end
$$;

create trigger team_memberships_notification
after insert or update of status, team_id on public.team_memberships
for each row execute function private.notify_team_membership_changed();

alter table public.notifications enable row level security;
alter table public.notifications force row level security;

create policy notifications_athlete_read
on public.notifications for select to authenticated
using (
  athlete_id = (select private.current_athlete_id())
  or (select private.has_any_role(array['admin']::public.app_role[]))
);

create policy notifications_athlete_mark_read
on public.notifications for update to authenticated
using (athlete_id = (select private.current_athlete_id()))
with check (athlete_id = (select private.current_athlete_id()));

create trigger notifications_insert_audit
after insert on public.notifications
for each row execute function private.capture_audit_log();

revoke all on public.notifications from public, anon, authenticated;
grant select on public.notifications to authenticated;
grant update(read_at) on public.notifications to authenticated;
grant all on public.notifications to service_role;
