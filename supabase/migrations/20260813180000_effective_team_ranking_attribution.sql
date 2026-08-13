create or replace function private.mirror_athlete_ranking_to_competition_formation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_formation_id uuid;
  v_formation_team_id uuid;
  v_event_at timestamptz;
  v_related_side_transaction uuid;
begin
  if new.transaction_scope <> 'athlete'
    or new.status <> 'homologated'
    or new.match_side_id is null
    or new.match_id is null
    or new.rule_code not in ('WIN', 'LOSS', 'ACE', 'ATTACK') then
    return new;
  end if;

  v_formation_id := private.ensure_match_side_competition_formation(new.match_side_id);
  if v_formation_id is null then return new; end if;

  if new.transaction_type = 'reversal' then
    select tx.id, tx.team_id
      into v_related_side_transaction, v_formation_team_id
    from public.ranking_transactions tx
    where tx.formation_id = v_formation_id
      and tx.match_side_id = new.match_side_id
      and tx.source_type = new.source_type
      and tx.source_id = new.source_id
      and tx.rule_code = new.rule_code
      and tx.transaction_scope = 'side'
      and tx.transaction_type = 'earn'
    order by tx.created_at desc
    limit 1;

    if v_related_side_transaction is null then return new; end if;
  else
    select coalesce(m.started_at, s.starts_at)
      into v_event_at
    from public.matches m
    left join public.ur_play_sessions s on s.id = m.session_id
    where m.id = new.match_id;

    select cf.team_id
      into v_formation_team_id
    from public.competition_formations cf
    where cf.id = v_formation_id;

    if v_formation_team_id is not null then
      if v_event_at is null or exists (
        select 1
        from public.competition_formation_members cfm
        where cfm.formation_id = v_formation_id
          and not exists (
            select 1
            from public.team_memberships tm
            where tm.athlete_id = cfm.athlete_id
              and tm.team_id = v_formation_team_id
              and tm.season_id = new.season_id
              and tm.status = 'active'
              and tm.starts_at <= v_event_at
              and (tm.ends_at is null or tm.ends_at > v_event_at)
          )
      ) then
        v_formation_team_id := null;
      end if;
    end if;
  end if;

  insert into public.ranking_transactions(
    season_id, season_cycle_id, athlete_id, team_id, pole_id, roster_id,
    match_side_id, formation_id, match_id, session_id, source_type, source_id,
    rule_id, rule_code, rule_version, points, points_applied, transaction_type,
    transaction_scope, status, event_context, event_context_data, metadata,
    related_transaction_id, processing_run_id, created_by, homologated_at,
    homologated_by, client_operation_id
  ) values (
    new.season_id, new.season_cycle_id, null, v_formation_team_id, new.pole_id,
    new.roster_id, new.match_side_id, v_formation_id, new.match_id,
    new.session_id, new.source_type, new.source_id, new.rule_id, new.rule_code,
    new.rule_version, new.points, new.points_applied, new.transaction_type,
    'side', new.status, new.event_context, new.event_context_data,
    new.metadata || jsonb_build_object(
      'competition_formation_mirror', true,
      'team_attribution_event_at', v_event_at
    ),
    v_related_side_transaction, new.processing_run_id, new.created_by,
    new.homologated_at, new.homologated_by, null
  ) on conflict do nothing;

  return new;
end;
$$;
