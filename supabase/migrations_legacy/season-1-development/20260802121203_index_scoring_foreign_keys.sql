create index matches_winner_side on public.matches(winner_side_id)
where winner_side_id is not null;
create index match_scoring_rules_created_by on public.match_scoring_rules(created_by);
create index match_rallies_winning_side on public.match_rallies(winning_side_id);
create index match_rallies_recorded_by on public.match_rallies(recorded_by);
create index match_rally_corrections_replacement_side
on public.match_rally_corrections(replacement_winning_side_id)
where replacement_winning_side_id is not null;
create index match_rally_corrections_corrected_by
on public.match_rally_corrections(corrected_by);
create index match_technical_actions_side on public.match_technical_actions(side_id)
where side_id is not null;
create index match_technical_actions_supersedes
on public.match_technical_actions(supersedes_action_id)
where supersedes_action_id is not null;
create index match_technical_actions_recorded_by
on public.match_technical_actions(recorded_by);
create index match_results_winner_side on public.match_results(winner_side_id)
where winner_side_id is not null;
create index match_results_homologated_by on public.match_results(homologated_by)
where homologated_by is not null;
create index match_result_versions_winner_side
on public.match_result_versions(winner_side_id)
where winner_side_id is not null;
create index match_result_versions_changed_by
on public.match_result_versions(changed_by);
create index match_result_correction_requests_result
on public.match_result_correction_requests(result_id);
create index match_result_correction_requests_requested_by
on public.match_result_correction_requests(requested_by);
create index match_result_correction_requests_resolved_by
on public.match_result_correction_requests(resolved_by)
where resolved_by is not null;
