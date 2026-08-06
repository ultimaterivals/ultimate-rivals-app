-- Cover remaining foreign-key lookup paths introduced by the final
-- demand/acquisition feature layer.

create index if not exists demand_formations_proposed_by_idx
  on public.demand_formations(proposed_by)
  where proposed_by is not null;

create index if not exists demand_opportunities_calendar_event_idx
  on public.demand_opportunities(calendar_event_id)
  where calendar_event_id is not null;

create index if not exists demand_opportunities_court_idx
  on public.demand_opportunities(court_id)
  where court_id is not null;

create index if not exists demand_opportunities_created_by_idx
  on public.demand_opportunities(created_by)
  where created_by is not null;

create index if not exists demand_opportunities_training_session_idx
  on public.demand_opportunities(training_session_id)
  where training_session_id is not null;

create index if not exists demand_opportunities_ur_play_session_idx
  on public.demand_opportunities(ur_play_session_id)
  where ur_play_session_id is not null;

create index if not exists demand_opportunities_venue_idx
  on public.demand_opportunities(venue_id)
  where venue_id is not null;

create index if not exists referral_codes_athlete_idx
  on public.referral_codes(athlete_id)
  where athlete_id is not null;

create index if not exists referral_codes_sponsor_idx
  on public.referral_codes(sponsor_id)
  where sponsor_id is not null;

create index if not exists referral_codes_team_idx
  on public.referral_codes(team_id)
  where team_id is not null;

create index if not exists referral_codes_venue_idx
  on public.referral_codes(venue_id)
  where venue_id is not null;

create index if not exists training_interest_windows_confirmed_session_idx
  on public.training_interest_windows(confirmed_training_session_id)
  where confirmed_training_session_id is not null;

create index if not exists training_interest_windows_created_by_idx
  on public.training_interest_windows(created_by)
  where created_by is not null;

create index if not exists training_interest_windows_pole_idx
  on public.training_interest_windows(pole_id)
  where pole_id is not null;

create index if not exists training_interests_pole_idx
  on public.training_interests(pole_id)
  where pole_id is not null;
