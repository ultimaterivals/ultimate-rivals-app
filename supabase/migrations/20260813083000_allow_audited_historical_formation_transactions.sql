-- Permit historical ranking reconstruction for competition formations without
-- fabricating matches. Live side-scoped transactions still require match_side_id.
-- The exception is restricted to explicitly audited historical imports.

alter table public.ranking_transactions
  drop constraint if exists ranking_transaction_target;

alter table public.ranking_transactions
  add constraint ranking_transaction_target check (
    (transaction_scope = 'athlete' and athlete_id is not null)
    or (
      transaction_scope = 'side'
      and (
        match_side_id is not null
        or (
          formation_id is not null
          and source_type = 'ranking_transaction'
          and metadata ->> 'origin' = 'historical_import'
          and coalesce(metadata ->> 'source_ref', '') <> ''
        )
      )
    )
    or (transaction_scope = 'team' and team_id is not null)
  );
