-- Ranking integrity: PARTICIPATION is awarded once per athlete per UR Play session.
-- Match-level WIN/LOSS and technical actions remain per match/action.

create or replace function private.enforce_single_session_participation_ranking()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_effective_points integer;
begin
  if new.rule_code <> 'PARTICIPATION'
    or new.transaction_type <> 'earn'
    or new.status <> 'homologated'
    or new.session_id is null
    or new.athlete_id is null then
    return new;
  end if;

  -- Serialize participation awards for the same athlete/session even when
  -- multiple matches are processed concurrently.
  perform pg_advisory_xact_lock(
    hashtextextended(
      'ranking:participation:' || new.session_id::text || ':' || new.athlete_id::text,
      0
    )
  );

  select coalesce(sum(tx.points_applied), 0)::integer
    into v_effective_points
  from public.ranking_transactions tx
  where tx.session_id = new.session_id
    and tx.athlete_id = new.athlete_id
    and tx.rule_code = 'PARTICIPATION'
    and tx.status = 'homologated';

  if v_effective_points > 0 then
    return null;
  end if;

  return new;
end;
$$;

drop trigger if exists ranking_transactions_single_session_participation
  on public.ranking_transactions;

create trigger ranking_transactions_single_session_participation
before insert on public.ranking_transactions
for each row
execute function private.enforce_single_session_participation_ranking();
