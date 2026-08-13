-- Fix standalone doubles formation creation for UUID pole snapshots.
-- PostgreSQL does not define min(uuid); preserve the same single-pole semantic
-- by selecting the sole distinct non-null pole snapshot when one exists.

create or replace function private.ensure_match_side_competition_formation(target_side uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_side public.match_sides;
  v_match public.matches;
  v_session public.ur_play_sessions;
  v_format_code text;
  v_signature text;
  v_display_name text;
  v_member_count integer;
  v_pole_id uuid;
  v_formation_id uuid;
begin
  select * into v_side
  from public.match_sides
  where id = target_side
  for update;

  if not found then
    return null;
  end if;

  if v_side.formation_id is not null then
    return v_side.formation_id;
  end if;

  select * into v_match from public.matches where id = v_side.match_id;
  select * into v_session from public.ur_play_sessions where id = v_match.session_id;
  select code into v_format_code from public.competitive_formats where id = v_match.format_id;

  if v_format_code <> 'doubles' then
    return null;
  end if;

  select
    md5(string_agg(mp.athlete_id::text, ',' order by mp.athlete_id::text)),
    coalesce(
      nullif(btrim(v_side.label), ''),
      string_agg(coalesce(a.public_name, a.full_name, a.athlete_code), ' e ' order by mp.position_order)
    ),
    count(*)::integer
  into v_signature, v_display_name, v_member_count
  from public.match_participants mp
  join public.athletes a on a.id = mp.athlete_id
  where mp.side_id = target_side
    and mp.match_id = v_match.id
    and mp.status = 'active';

  select pole_snapshot_id
  into v_pole_id
  from (
    select distinct mp.pole_snapshot_id
    from public.match_participants mp
    where mp.side_id = target_side
      and mp.match_id = v_match.id
      and mp.status = 'active'
      and mp.pole_snapshot_id is not null
  ) poles
  limit 1;

  if (
    select count(distinct mp.pole_snapshot_id)
    from public.match_participants mp
    where mp.side_id = target_side
      and mp.match_id = v_match.id
      and mp.status = 'active'
      and mp.pole_snapshot_id is not null
  ) <> 1 then
    v_pole_id := null;
  end if;

  if v_member_count <> 2 or v_signature is null then
    return null;
  end if;

  select cf.id into v_formation_id
  from public.competition_formations cf
  where cf.season_id = v_session.season_id
    and cf.format_id = v_match.format_id
    and cf.category_id is not distinct from v_match.category_id
    and cf.level is not distinct from v_match.level
    and cf.member_signature = v_signature
    and cf.status = 'active'
  limit 1;

  if v_formation_id is null then
    insert into public.competition_formations(
      season_id, format_id, category_id, level, team_id, pole_id,
      display_name, member_signature, status
    ) values (
      v_session.season_id, v_match.format_id, v_match.category_id, v_match.level,
      v_side.team_id, v_pole_id, v_display_name, v_signature, 'active'
    )
    returning id into v_formation_id;
  elsif v_side.team_id is not null then
    update public.competition_formations
    set team_id = coalesce(team_id, v_side.team_id),
        pole_id = coalesce(pole_id, v_pole_id),
        updated_at = now()
    where id = v_formation_id;
  end if;

  insert into public.competition_formation_members(formation_id, athlete_id, position_order)
  select v_formation_id, mp.athlete_id, mp.position_order
  from public.match_participants mp
  where mp.side_id = target_side
    and mp.match_id = v_match.id
    and mp.status = 'active'
  on conflict (formation_id, athlete_id) do nothing;

  update public.match_sides
  set formation_id = v_formation_id
  where id = target_side;

  return v_formation_id;
end;
$$;

revoke all on function private.ensure_match_side_competition_formation(uuid)
from public, anon, authenticated;
