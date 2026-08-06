-- Ultimate Rivals Season 1 production reference data bootstrap.
-- Run after the production baseline migration in a verified empty PROD project.
-- Idempotent: safe to run more than once; no athletes, teams, venues, sponsors, matches, payments or operational seed records.
-- Never run DEV/test seeds in PROD; never use `supabase db push --include-seed` in PROD.

begin;

-- Source: 20260801175746_core_entities.sql
-- purpose: SYSTEM_REQUIRED or REFERENCE_DATA; idempotency: ON CONFLICT / SELECT-safe source statement; environment safety: PROD_ALLOWED.
insert into public.competitive_categories (code, name) values
  ('female', 'Feminino'),
  ('male', 'Masculino'),
  ('mixed', 'Misto')
on conflict (code) do update set name = excluded.name;

-- Source: 20260801175746_core_entities.sql
-- purpose: SYSTEM_REQUIRED or REFERENCE_DATA; idempotency: ON CONFLICT / SELECT-safe source statement; environment safety: PROD_ALLOWED.
insert into public.competitive_formats (code, name) values
  ('doubles', 'Duplas'),
  ('fours', 'Quartetos')
on conflict (code) do update set name = excluded.name;

-- Source: 20260801200421_athlete_360_domain.sql
-- purpose: SYSTEM_REQUIRED or REFERENCE_DATA; idempotency: ON CONFLICT / SELECT-safe source statement; environment safety: PROD_ALLOWED.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('athlete-avatars','athlete-avatars',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

-- Source: 20260801211243_teams_rosters_operational_domain.sql
-- purpose: SYSTEM_REQUIRED or REFERENCE_DATA; idempotency: ON CONFLICT / SELECT-safe source statement; environment safety: PROD_ALLOWED.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('team-logos','team-logos',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

-- Source: 20260801215832_seasons_leveling_assessments_progression.sql
-- purpose: SYSTEM_REQUIRED or REFERENCE_DATA; idempotency: ON CONFLICT / SELECT-safe source statement; environment safety: PROD_ALLOWED.
insert into public.assessment_criteria(code,name,category,sort_order) values
('serve','Saque','TECHNICAL',10),('reception','Recepção','TECHNICAL',20),('setting','Levantamento','TECHNICAL',30),
('attack','Ataque','TECHNICAL',40),('block','Bloqueio','TECHNICAL',50),('defense','Defesa','TECHNICAL',60),
('game_reading','Leitura de jogo','TACTICAL',70),('decision_making','Tomada de decisão','COGNITIVE',80),
('positioning','Posicionamento','TACTICAL',90),('adaptation','Adaptação','COGNITIVE',100),('communication','Comunicação','BEHAVIORAL',110),
('discipline','Disciplina','BEHAVIORAL',120),('posture','Postura','BEHAVIORAL',130),('competitiveness','Competitividade','BEHAVIORAL',140),
('teamwork','Trabalho em equipe','BEHAVIORAL',150),('resilience','Resiliência','BEHAVIORAL',160)
on conflict (code) do update set
  name = excluded.name,
  category = excluded.category,
  sort_order = excluded.sort_order;

-- Source: 20260802133109_ranking_ledger_engine.sql
-- purpose: SYSTEM_REQUIRED or REFERENCE_DATA; idempotency: ON CONFLICT / SELECT-safe source statement; environment safety: PROD_ALLOWED.
insert into public.ranking_rules(
  rule_code, name, description, event_context, transaction_scope,
  point_category, points, active, valid_from, version, metadata
)
values
  ('PARTICIPATION', 'Participação em jogo', 'Participante efetivo de partida homologada.', 'ur_play', 'athlete', 'participation', 8, true, '2026-01-01', 1, '{}'),
  ('WIN', 'Vitória', 'Participante efetivo do lado vencedor.', 'ur_play', 'athlete', 'result', 6, true, '2026-01-01', 1, '{}'),
  ('LOSS', 'Derrota', 'Participante efetivo do lado perdedor.', 'ur_play', 'athlete', 'result', 2, true, '2026-01-01', 1, '{}'),
  ('ACE', 'Ace', 'Ação técnica homologada de ace.', 'ur_play', 'athlete', 'technical', 4, true, '2026-01-01', 1, '{}'),
  ('ATTACK', 'Ataque', 'Ação técnica homologada de ataque.', 'ur_play', 'athlete', 'technical', 2, true, '2026-01-01', 1, '{}'),
  ('BLOCK', 'Bloqueio', 'Ação técnica homologada de bloqueio.', 'ur_play', 'athlete', 'technical', 3, true, '2026-01-01', 1, '{}'),
  ('DEFENSE', 'Defesa', 'Ação técnica homologada de defesa.', 'ur_play', 'athlete', 'technical', 1, true, '2026-01-01', 1, '{}'),
  ('ASSIST', 'Assistência', 'Ação técnica homologada de assistência.', 'ur_play', 'athlete', 'technical', 1, true, '2026-01-01', 1, '{}'),
  ('STREAK_3', 'Sequência de 3', 'Mérito coletivo de lado preparado sem distribuição individual.', 'ur_play', 'side', 'bonus', 5, false, '2026-01-01', 1, '{"streak_bonus_mode":"highest_only","distribution":"pending"}'),
  ('STREAK_5', 'Sequência de 5', 'Mérito coletivo de lado preparado sem distribuição individual.', 'ur_play', 'side', 'bonus', 10, false, '2026-01-01', 1, '{"streak_bonus_mode":"highest_only","distribution":"pending"}'),
  ('GAME_POINT', 'Game point', 'Bônus do autor identificado da ação técnica do rally decisivo.', 'ur_play', 'athlete', 'bonus', 6, true, '2026-01-01', 1, '{"target":"final_rally_technical_action_author"}'),
  ('COMEBACK', 'Comeback', 'Regra preparada; déficit mínimo e homologação oficial pendentes.', 'ur_play', 'side', 'bonus', 12, false, '2026-01-01', 1, '{"comeback_min_deficit":3,"approval":"pending"}'),
  ('MVP', 'MVP', 'Reconhecimento manual homologado, sem seleção automática.', 'ur_play', 'athlete', 'bonus', 10, true, '2026-01-01', 1, '{"source":"match_recognition"}'),
  ('FAIR_PLAY', 'Fair Play', 'Reconhecimento manual homologado, sem seleção automática.', 'ur_play', 'athlete', 'bonus', 5, true, '2026-01-01', 1, '{"source":"match_recognition"}'),
  ('YELLOW_CARD', 'Cartão amarelo', 'Penalidade disciplinar homologada.', 'ur_play', 'athlete', 'penalty', -5, true, '2026-01-01', 1, '{"source":"disciplinary_event"}'),
  ('RED_CARD', 'Cartão vermelho', 'Penalidade disciplinar homologada.', 'ur_play', 'athlete', 'penalty', -20, true, '2026-01-01', 1, '{"source":"disciplinary_event"}'),
  ('SQUAD_RESERVE_PRESENT', 'Reserva presente', 'Mérito por presença de reserva preparado, sem atribuição automática no UR Play.', 'ur_play', 'athlete', 'participation', 0, false, '2026-01-01', 1, '{"distribution":"disabled"}')
on conflict (season_id, rule_code, event_context, version) do nothing;

-- Source: 20260805154400_season_calendar_operations.sql
-- purpose: SYSTEM_REQUIRED or REFERENCE_DATA; idempotency: ON CONFLICT / SELECT-safe source statement; environment safety: PROD_ALLOWED.
insert into public.calendar_q1_templates (
  pole_id,
  name,
  weekday,
  starts_at,
  ends_at,
  event_type,
  competition_mode,
  target_courts,
  alternates_friday,
  notes
)
select p.id, template.name, template.weekday, template.starts_at::time, template.ends_at::time,
  template.event_type::public.calendar_event_type, template.competition_mode, template.target_courts,
  template.alternates_friday, template.notes
from public.poles p
join (
  values
    ('betim', 'Betim segunda 18h', 1, '18:00', '20:00', 'ur_play', 'scheduled_rounds', 1, false, 'Q1 base slot: Monday 18:00-20:00'),
    ('betim', 'Betim segunda 20h', 1, '20:00', '22:00', 'ur_play', 'scheduled_rounds', 1, false, 'Q1 base slot: Monday 20:00-22:00'),
    ('betim', 'Betim terça 18h', 2, '18:00', '20:00', 'ur_play', 'scheduled_rounds', 1, false, 'Q1 base slot: Tuesday 18:00-20:00'),
    ('betim', 'Betim terça 20h', 2, '20:00', '22:00', 'ur_play', 'scheduled_rounds', 1, false, 'Q1 base slot: Tuesday 20:00-22:00'),
    ('contagem', 'Contagem quarta 18h', 3, '18:00', '20:00', 'ur_play', 'scheduled_rounds', 1, false, 'Q1 base slot: Wednesday 18:00-20:00'),
    ('contagem', 'Contagem quarta 20h', 3, '20:00', '22:00', 'ur_play', 'scheduled_rounds', 1, false, 'Q1 base slot: Wednesday 20:00-22:00'),
    ('contagem', 'Contagem quinta 18h', 4, '18:00', '20:00', 'ur_play', 'scheduled_rounds', 1, false, 'Q1 base slot: Thursday 18:00-20:00'),
    ('contagem', 'Contagem quinta 20h', 4, '20:00', '22:00', 'ur_play', 'scheduled_rounds', 1, false, 'Q1 base slot: Thursday 20:00-22:00'),
    ('betim', 'Sexta alternada Betim 18h', 5, '18:00', '20:00', 'ur_play', 'scheduled_rounds', 1, true, 'Q1 alternating Friday slot'),
    ('betim', 'Sexta alternada Betim 20h', 5, '20:00', '22:00', 'ur_play', 'scheduled_rounds', 1, true, 'Q1 alternating Friday slot'),
    ('contagem', 'Sexta alternada Contagem 18h', 5, '18:00', '20:00', 'ur_play', 'scheduled_rounds', 1, true, 'Q1 alternating Friday slot'),
    ('contagem', 'Sexta alternada Contagem 20h', 5, '20:00', '22:00', 'ur_play', 'scheduled_rounds', 1, true, 'Q1 alternating Friday slot')
) as template(pole_key, name, weekday, starts_at, ends_at, event_type, competition_mode, target_courts, alternates_friday, notes)
  on lower(p.name) like '%' || template.pole_key || '%'
on conflict (pole_id, weekday, starts_at, ends_at, event_type) do nothing;

-- Source: 20260805160817_season_staff_refereeing_core.sql
-- purpose: SYSTEM_REQUIRED or REFERENCE_DATA; idempotency: ON CONFLICT / SELECT-safe source statement; environment safety: PROD_ALLOWED.
insert into public.staff_role_catalog (role, label, category, formal_officiating, description)
values
  ('technical_director', 'Technical director', 'technical', false, 'Owns technical standards and homologation policy.'),
  ('pole_coordinator', 'Pole coordinator', 'operations', false, 'Coordinates local sessions, staff and venue operations.'),
  ('technical_evaluator', 'Technical evaluator', 'technical', false, 'Performs athlete leveling and development evaluations.'),
  ('referee', 'Referee', 'officiating', true, 'Formal match referee when required.'),
  ('assistant_referee', 'Assistant referee', 'officiating', true, 'Supports formal refereeing.'),
  ('score_operator', 'Score operator', 'officiating', false, 'Operates scoring console under event rules.'),
  ('performance_analyst', 'Performance analyst', 'technical', false, 'Captures performance evidence and technical notes.'),
  ('media_operator', 'Media operator', 'media', false, 'Captures media assets and operational content.'),
  ('coach', 'Coach', 'coaching', false, 'Leads training sessions and athlete development activities.')
on conflict (role) do update set
  label = excluded.label,
  category = excluded.category,
  formal_officiating = excluded.formal_officiating,
  description = excluded.description,
  active = true;

-- Source: 20260805162929_season_commercial_indexes_seeds.sql
-- purpose: SYSTEM_REQUIRED or REFERENCE_DATA; idempotency: ON CONFLICT / SELECT-safe source statement; environment safety: PROD_ALLOWED.
insert into public.products(code, name, product_type, description, metadata)
values
  ('ur_play_single', 'UR Play Avulso', 'ur_play', 'Sessão avulsa UR Play.', '{"base_price":25}'),
  ('ur_play_pack_4', 'Pack 4', 'ur_play', 'Pacote configurável de quatro sessões.', '{}'),
  ('ur_play_pack_8', 'Pack 8', 'ur_play', 'Pacote configurável de oito sessões.', '{}'),
  ('ur_play_development', 'UR Play + Desenvolvimento', 'development', 'Pacote combinado configurável.', '{}'),
  ('journey_ur_hunter', 'Jornada UR/Hunter', 'hunter', 'Jornada comportamental e desenvolvimento.', '{}'),
  ('tournament_q1_entry', 'Torneio Q1 por divisão', 'tournament', 'Inscrição configurável por atleta/divisão.', '{"multi_entry_prices":[100,90,85]}')
on conflict (code) do update set name=excluded.name, product_type=excluded.product_type, description=excluded.description, metadata=excluded.metadata, active=true, updated_at=now();

-- Source: 20260805162929_season_commercial_indexes_seeds.sql
-- purpose: SYSTEM_REQUIRED or REFERENCE_DATA; idempotency: ON CONFLICT / SELECT-safe source statement; environment safety: PROD_ALLOWED.
insert into public.pricing_rules(product_id, scope, unit_amount, rule_config)
select id, 'q1_default', 25, '{"editable_by_admin":true}' from public.products where code='ur_play_single';

-- Source: 20260805162929_season_commercial_indexes_seeds.sql
-- purpose: SYSTEM_REQUIRED or REFERENCE_DATA; idempotency: ON CONFLICT / SELECT-safe source statement; environment safety: PROD_ALLOWED.
insert into public.pricing_rules(product_id, scope, unit_amount, rule_config)
select id, 'q1_tournament_multi_entry', 100, '{"entry_prices":[100,90,85],"snapshot_on_publish":true}' from public.products where code='tournament_q1_entry';

-- Source: 20260805162929_season_commercial_indexes_seeds.sql
-- purpose: SYSTEM_REQUIRED or REFERENCE_DATA; idempotency: ON CONFLICT / SELECT-safe source statement; environment safety: PROD_ALLOWED.
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

-- Source: 20260805164229_season_development_training_hunter_tables.sql
-- purpose: SYSTEM_REQUIRED or REFERENCE_DATA; idempotency: ON CONFLICT / SELECT-safe source statement; environment safety: PROD_ALLOWED.
insert into public.hunter_themes(week_number, code, name)
values
  (1,'commitment','Commitment'), (2,'discipline','Discipline'), (3,'communication','Communication'),
  (4,'resilience','Resilience'), (5,'focus','Focus'), (6,'responsibility','Responsibility'),
  (7,'leadership','Leadership'), (8,'consistency','Consistency'), (9,'emotional_control','Emotional control'),
  (10,'healthy_competitiveness','Healthy competitiveness'), (11,'team_service','Team service'), (12,'legacy','Legacy')
on conflict (week_number) do update set code=excluded.code, name=excluded.name;

-- Source: 20260805165852_season_prizes_repasses_finance.sql
-- purpose: SYSTEM_REQUIRED or REFERENCE_DATA; idempotency: ON CONFLICT / SELECT-safe source statement; environment safety: PROD_ALLOWED.
insert into public.tournament_prize_plan_templates (product, code, name, config)
values
  ('series', 'q1_ur_series_cash_prizes', 'UR Series Q1 — premiação referência', '{"admin_review_required":true,"snapshot_on_publish":true}'::jsonb),
  ('cup', 'q1_ur_cup_cash_prizes', 'UR Cup Q1 — premiação referência', '{"admin_review_required":true,"snapshot_on_publish":true}'::jsonb),
  ('legends', 'q1_ur_legends_cash_prizes', 'UR Legends Q1 — premiação referência', '{"admin_review_required":true,"snapshot_on_publish":true}'::jsonb)
on conflict (code) do update
set name = excluded.name,
    config = excluded.config,
    updated_at = now();

-- Source: 20260805165852_season_prizes_repasses_finance.sql
-- purpose: SYSTEM_REQUIRED or REFERENCE_DATA; idempotency: ON CONFLICT / SELECT-safe source statement; environment safety: PROD_ALLOWED.
insert into public.tournament_prize_template_allocations (template_id, award_code, award_label, amount, sort_order)
select tpl.id, item.award_code, item.award_label, item.amount, item.sort_order
from public.tournament_prize_plan_templates tpl
join (
  values
    ('q1_ur_series_cash_prizes', 'champion', 'Campeão', 800.00::numeric, 1::smallint),
    ('q1_ur_series_cash_prizes', 'runner_up', 'Vice', 400.00::numeric, 2::smallint),
    ('q1_ur_series_cash_prizes', 'third_place', '3º', 300.00::numeric, 3::smallint),
    ('q1_ur_series_cash_prizes', 'mvp', 'MVP', 500.00::numeric, 4::smallint),
    ('q1_ur_cup_cash_prizes', 'champion', 'Campeão', 1200.00::numeric, 1::smallint),
    ('q1_ur_cup_cash_prizes', 'runner_up', 'Vice', 800.00::numeric, 2::smallint),
    ('q1_ur_cup_cash_prizes', 'third_place', '3º', 500.00::numeric, 3::smallint),
    ('q1_ur_cup_cash_prizes', 'mvp', 'MVP', 700.00::numeric, 4::smallint),
    ('q1_ur_legends_cash_prizes', 'champion', 'Campeão', 800.00::numeric, 1::smallint),
    ('q1_ur_legends_cash_prizes', 'runner_up', 'Vice', 400.00::numeric, 2::smallint),
    ('q1_ur_legends_cash_prizes', 'third_place', '3º', 300.00::numeric, 3::smallint),
    ('q1_ur_legends_cash_prizes', 'mvp', 'MVP', 500.00::numeric, 4::smallint)
) as item(template_code, award_code, award_label, amount, sort_order)
  on item.template_code = tpl.code
on conflict (template_id, award_code) do update
set award_label = excluded.award_label,
    amount = excluded.amount,
    sort_order = excluded.sort_order;

-- Source: 20260805165852_season_prizes_repasses_finance.sql
-- purpose: SYSTEM_REQUIRED or REFERENCE_DATA; idempotency: ON CONFLICT / SELECT-safe source statement; environment safety: PROD_ALLOWED.
insert into public.season_repass_plans (code, name, total_amount, currency, status, eligibility_snapshot, frozen_snapshot)
values (
  'q1_official_repass_5000',
  'Repasse trimestral oficial Q1 — referência',
  5000.00,
  'BRL',
  'draft',
  '{"ranking_source":"final homologado","eligibility_required":true,"legends_is_delivery_stage":true,"legends_does_not_redefine_quarterly_ranking":true}'::jsonb,
  '{"team_allocations":[1500,1000,1000],"athlete_allocations":[500,500,500]}'::jsonb
)
on conflict (code) do update
set name = excluded.name,
    total_amount = excluded.total_amount,
    eligibility_snapshot = excluded.eligibility_snapshot,
    frozen_snapshot = excluded.frozen_snapshot,
    updated_at = now();

-- Source: 20260805165852_season_prizes_repasses_finance.sql
-- purpose: SYSTEM_REQUIRED or REFERENCE_DATA; idempotency: ON CONFLICT / SELECT-safe source statement; environment safety: PROD_ALLOWED.
insert into public.season_repass_allocations (repass_plan_id, allocation_code, allocation_label, beneficiary_type, rank_position, amount)
select plan.id, item.allocation_code, item.allocation_label, item.beneficiary_type, item.rank_position, item.amount
from public.season_repass_plans plan
join (
  values
    ('team_1', '1ª equipe elegível', 'team', 1::smallint, 1500.00::numeric),
    ('team_2', '2ª equipe elegível', 'team', 2::smallint, 1000.00::numeric),
    ('team_3', '3ª equipe elegível', 'team', 3::smallint, 1000.00::numeric),
    ('athlete_1', '1º atleta', 'athlete', 1::smallint, 500.00::numeric),
    ('athlete_2', '2º atleta', 'athlete', 2::smallint, 500.00::numeric),
    ('athlete_3', '3º atleta', 'athlete', 3::smallint, 500.00::numeric)
) as item(allocation_code, allocation_label, beneficiary_type, rank_position, amount)
  on plan.code = 'q1_official_repass_5000'
on conflict (repass_plan_id, allocation_code) do update
set allocation_label = excluded.allocation_label,
    beneficiary_type = excluded.beneficiary_type,
    rank_position = excluded.rank_position,
    amount = excluded.amount;

-- Source: 20260805181725_season_wallet_media_reports_rls_seed.sql
-- purpose: SYSTEM_REQUIRED or REFERENCE_DATA; idempotency: ON CONFLICT / SELECT-safe source statement; environment safety: PROD_ALLOWED.
insert into public.ur_coin_rule_sets (code, name, status, metadata)
values ('q1_ur_coin_mvp', 'UR Coins Q1 MVP', 'active', '{"ranking_points_are_separate":true}'::jsonb)
on conflict (code) do update set name = excluded.name, status = excluded.status, metadata = excluded.metadata, updated_at = now();

-- Source: 20260805181725_season_wallet_media_reports_rls_seed.sql
-- purpose: SYSTEM_REQUIRED or REFERENCE_DATA; idempotency: ON CONFLICT / SELECT-safe source statement; environment safety: PROD_ALLOWED.
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

commit;
