-- Season 1 final internal inbox notification types.

alter type public.athlete_notification_type add value if not exists 'tournament_registration';
alter type public.athlete_notification_type add value if not exists 'eligibility_reached';
alter type public.athlete_notification_type add value if not exists 'eligibility_missing';
alter type public.athlete_notification_type add value if not exists 'series_qualified';
alter type public.athlete_notification_type add value if not exists 'cup_qualified';
alter type public.athlete_notification_type add value if not exists 'legends_invited';
alter type public.athlete_notification_type add value if not exists 'legends_confirmed';
alter type public.athlete_notification_type add value if not exists 'training_scheduled';
alter type public.athlete_notification_type add value if not exists 'development_review_due';
alter type public.athlete_notification_type add value if not exists 'hunter_mission';
alter type public.athlete_notification_type add value if not exists 'payment_verified';
alter type public.athlete_notification_type add value if not exists 'market_offer';
alter type public.athlete_notification_type add value if not exists 'market_redemption';
alter type public.athlete_notification_type add value if not exists 'wallet_earn';
alter type public.athlete_notification_type add value if not exists 'wallet_spend';
alter type public.athlete_notification_type add value if not exists 'repass_announced';
