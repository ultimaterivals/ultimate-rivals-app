-- Season 1 final completion: UR Coins/media/report RLS and Q1 rule seeds.

insert into public.ur_coin_rule_sets (code, name, status, metadata)
values ('q1_ur_coin_mvp', 'UR Coins Q1 MVP', 'active', '{"ranking_points_are_separate":true}'::jsonb)
on conflict (code) do update set name = excluded.name, status = excluded.status, metadata = excluded.metadata, updated_at = now();

insert into public.ur_coin_rules (rule_set_id, code, name, transaction_type, direction, amount, source_type, status, rule_config)
select rs.id, item.code, item.name, 'earn'::public.ur_coin_transaction_type, 'credit'::public.ur_coin_direction, item.amount, item.source_type, item.status::public.ur_coin_rule_status, item.rule_config::jsonb
from public.ur_coin_rule_sets rs
join (
  values
    ('ur_play_participation', 'Participação UR Play', 4::integer, 'match_result', 'active', '{"confirmed":true}'::jsonb),
    ('match_win', 'Vitória homologada', 6::integer, 'match_result', 'active', '{"confirmed":true}'::jsonb),
    ('match_loss', 'Derrota homologada', 0::integer, 'match_result', 'active', '{"confirmed":true,"zero_amount":true}'::jsonb)
) as item(code, name, amount, source_type, status, rule_config) on rs.code = 'q1_ur_coin_mvp'
on conflict (rule_set_id, code) do update set name = excluded.name, amount = excluded.amount, status = excluded.status, rule_config = excluded.rule_config, updated_at = now();

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'ur_coin_rule_sets','ur_coin_rules',
    'media_assets','match_media_links','video_annotations','highlight_clips','analysis_suggestions'
  ]
  loop
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function private.set_updated_at()', table_name, table_name);
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function private.capture_audit_log()', table_name, table_name);
  end loop;
end $$;

alter table public.ur_coin_transactions enable row level security;
alter table public.ur_coin_transactions force row level security;
create trigger ur_coin_transactions_audit
after insert or update or delete on public.ur_coin_transactions
for each row execute function private.capture_audit_log();

create policy ur_coin_rule_sets_read on public.ur_coin_rule_sets for select to authenticated using (status = 'active' or private.has_any_role(array['admin','operator']::public.app_role[]));
create policy ur_coin_rule_sets_insert on public.ur_coin_rule_sets for insert to authenticated with check (private.has_any_role(array['admin']::public.app_role[]));
create policy ur_coin_rule_sets_update on public.ur_coin_rule_sets for update to authenticated using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));
create policy ur_coin_rule_sets_delete on public.ur_coin_rule_sets for delete to authenticated using (private.has_any_role(array['admin']::public.app_role[]));

create policy ur_coin_rules_read on public.ur_coin_rules for select to authenticated using (status = 'active' or private.has_any_role(array['admin','operator']::public.app_role[]));
create policy ur_coin_rules_insert on public.ur_coin_rules for insert to authenticated with check (private.has_any_role(array['admin']::public.app_role[]));
create policy ur_coin_rules_update on public.ur_coin_rules for update to authenticated using (private.has_any_role(array['admin']::public.app_role[])) with check (private.has_any_role(array['admin']::public.app_role[]));
create policy ur_coin_rules_delete on public.ur_coin_rules for delete to authenticated using (private.has_any_role(array['admin']::public.app_role[]));

create policy ur_coin_transactions_read on public.ur_coin_transactions for select to authenticated using (athlete_id = private.current_athlete_id() or private.has_any_role(array['admin','operator']::public.app_role[]));
create policy ur_coin_transactions_insert on public.ur_coin_transactions for insert to authenticated with check (private.has_any_role(array['admin']::public.app_role[]));

create policy media_assets_read on public.media_assets for select to authenticated using (
  status in ('publishable','public')
  or athlete_id = private.current_athlete_id()
  or private.has_any_role(array['admin','operator']::public.app_role[])
);
create policy media_assets_insert on public.media_assets for insert to authenticated with check (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy media_assets_update on public.media_assets for update to authenticated using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy media_assets_delete on public.media_assets for delete to authenticated using (private.has_any_role(array['admin']::public.app_role[]));

create policy match_media_links_read on public.match_media_links for select to authenticated using (
  visible_to_athletes
  or private.can_read_match(match_id)
  or private.has_any_role(array['admin','operator']::public.app_role[])
);
create policy match_media_links_insert on public.match_media_links for insert to authenticated with check (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy match_media_links_update on public.match_media_links for update to authenticated using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy match_media_links_delete on public.match_media_links for delete to authenticated using (private.has_any_role(array['admin']::public.app_role[]));

create policy video_annotations_read on public.video_annotations for select to authenticated using (
  athlete_id = private.current_athlete_id()
  or private.has_any_role(array['admin','operator']::public.app_role[])
);
create policy video_annotations_insert on public.video_annotations for insert to authenticated with check (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy video_annotations_update on public.video_annotations for update to authenticated using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy video_annotations_delete on public.video_annotations for delete to authenticated using (private.has_any_role(array['admin']::public.app_role[]));

create policy highlight_clips_read on public.highlight_clips for select to authenticated using (
  status in ('publishable','public')
  or athlete_id = private.current_athlete_id()
  or private.has_any_role(array['admin','operator']::public.app_role[])
);
create policy highlight_clips_insert on public.highlight_clips for insert to authenticated with check (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy highlight_clips_update on public.highlight_clips for update to authenticated using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy highlight_clips_delete on public.highlight_clips for delete to authenticated using (private.has_any_role(array['admin']::public.app_role[]));

create policy analysis_suggestions_read on public.analysis_suggestions for select to authenticated using (
  athlete_id = private.current_athlete_id()
  or private.has_any_role(array['admin','operator']::public.app_role[])
);
create policy analysis_suggestions_insert on public.analysis_suggestions for insert to authenticated with check (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy analysis_suggestions_update on public.analysis_suggestions for update to authenticated using (private.has_any_role(array['admin','operator']::public.app_role[])) with check (private.has_any_role(array['admin','operator']::public.app_role[]));
create policy analysis_suggestions_delete on public.analysis_suggestions for delete to authenticated using (private.has_any_role(array['admin']::public.app_role[]));

grant select, insert, update, delete on public.ur_coin_rule_sets, public.ur_coin_rules to authenticated;
grant select, insert on public.ur_coin_transactions to authenticated;
grant select on public.ur_coin_wallet_projection to authenticated;

grant select, insert, update, delete on
  public.media_assets,
  public.match_media_links,
  public.video_annotations,
  public.highlight_clips,
  public.analysis_suggestions
to authenticated;

grant select on
  public.athlete_report_summary,
  public.team_report_summary,
  public.venue_report_summary,
  public.sponsor_report_summary,
  public.season_executive_report_summary
to authenticated;

revoke all on
  public.ur_coin_rule_sets,
  public.ur_coin_rules,
  public.ur_coin_transactions,
  public.media_assets,
  public.match_media_links,
  public.video_annotations,
  public.highlight_clips,
  public.analysis_suggestions
from anon;

grant all on
  public.ur_coin_rule_sets,
  public.ur_coin_rules,
  public.ur_coin_transactions,
  public.media_assets,
  public.match_media_links,
  public.video_annotations,
  public.highlight_clips,
  public.analysis_suggestions
to service_role;
