-- Season 1 completion — commercial indexes and configurable Q1 seed data.

create index products_type_active on public.products(product_type, active);
create index pricing_rules_product_active on public.pricing_rules(product_id, active, starts_at);
create index packages_product_active on public.packages(product_id, active);
create index athlete_commercial_packages_athlete on public.athlete_commercial_packages(athlete_id, status);
create index athlete_commercial_packages_package on public.athlete_commercial_packages(package_id);
create index athlete_commercial_packages_season on public.athlete_commercial_packages(season_id) where season_id is not null;
create index athlete_commercial_packages_created_by on public.athlete_commercial_packages(created_by) where created_by is not null;
create index charges_athlete_status on public.charges(athlete_id, status, due_at) where athlete_id is not null;
create index charges_team_status on public.charges(team_id, status, due_at) where team_id is not null;
create index charges_product on public.charges(product_id) where product_id is not null;
create index charges_package on public.charges(package_id) where package_id is not null;
create index charges_tournament_registration on public.charges(tournament_registration_id) where tournament_registration_id is not null;
create index charges_ur_play_registration on public.charges(ur_play_registration_id) where ur_play_registration_id is not null;
create index charges_created_by on public.charges(created_by) where created_by is not null;
create index charges_verified_by on public.charges(verified_by) where verified_by is not null;
create index payments_charge_status on public.payments(charge_id, status);
create index payments_submitted_by on public.payments(submitted_by) where submitted_by is not null;
create index payments_verified_by on public.payments(verified_by) where verified_by is not null;

insert into public.products(code, name, product_type, description, metadata)
values
  ('ur_play_single', 'UR Play Avulso', 'ur_play', 'Sessão avulsa UR Play.', '{"base_price":25}'),
  ('ur_play_pack_4', 'Pack 4', 'ur_play', 'Pacote configurável de quatro sessões.', '{}'),
  ('ur_play_pack_8', 'Pack 8', 'ur_play', 'Pacote configurável de oito sessões.', '{}'),
  ('ur_play_development', 'UR Play + Desenvolvimento', 'development', 'Pacote combinado configurável.', '{}'),
  ('journey_ur_hunter', 'Jornada UR/Hunter', 'hunter', 'Jornada comportamental e desenvolvimento.', '{}'),
  ('tournament_q1_entry', 'Torneio Q1 por divisão', 'tournament', 'Inscrição configurável por atleta/divisão.', '{"multi_entry_prices":[100,90,85]}')
on conflict (code) do update set name=excluded.name, product_type=excluded.product_type, description=excluded.description, metadata=excluded.metadata, active=true, updated_at=now();

insert into public.pricing_rules(product_id, scope, unit_amount, rule_config)
select id, 'q1_default', 25, '{"editable_by_admin":true}' from public.products where code='ur_play_single';

insert into public.pricing_rules(product_id, scope, unit_amount, rule_config)
select id, 'q1_tournament_multi_entry', 100, '{"entry_prices":[100,90,85],"snapshot_on_publish":true}' from public.products where code='tournament_q1_entry';

insert into public.packages(code, name, product_id, included_units, benefits)
select package.code, package.name, product.id, package.units, package.benefits
from (values
  ('ur_play_pack_4', 'Pack 4', 4, '["ur_play_sessions"]'::jsonb),
  ('ur_play_pack_8', 'Pack 8', 8, '["ur_play_sessions"]'::jsonb),
  ('ur_play_development', 'UR Play + Desenvolvimento', null, '["ur_play","development"]'::jsonb),
  ('journey_ur_hunter', 'Jornada UR/Hunter', null, '["development","hunter"]'::jsonb)
) as package(code, name, units, benefits)
left join public.products product on product.code = package.code
on conflict (code) do update set name=excluded.name, product_id=excluded.product_id, included_units=excluded.included_units, benefits=excluded.benefits, active=true, updated_at=now();
