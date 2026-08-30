-- Complete the Command Center catalog with the two operational ownership seats
-- required by the UR Play and Operations manuals. These are responsibilities,
-- not mandatory headcount: one person may hold more than one seat temporarily.

insert into public.command_functions(
  workstream_id, code, title, mission, criticality, expected_outcomes,
  performance_indicators, decision_authority, weekly_ritual
)
select workstream.id, seed.code, seed.title, seed.mission,
  seed.criticality::public.command_function_criticality, seed.outcomes, seed.indicators,
  seed.authority, seed.ritual
from (values
  (
    'sports',
    'sports-data-ranking',
    'Coordenação de Dados e Ranking',
    'Garantir cadastro, presença, resultados, pontuação, ranking, UR Coins, correções e histórico esportivo homologados.',
    'critical',
    array['Dados de sessão completos','Ranking publicado no prazo','Correções rastreáveis','Histórico confiável'],
    array['Completude dos dados','Tempo de fechamento','Correções por ciclo','Atraso de publicação'],
    'Homologa lançamentos dentro das regras e bloqueia publicação sem integridade mínima; exceções escalam para Direção Esportiva, Financeiro ou CEO.',
    'Fechamento semanal de dados, ranking, UR Coins, divergências e pendências.'
  ),
  (
    'sports',
    'technical-development',
    'Coordenação Técnica e Desenvolvimento',
    'Conduzir nivelamento, avaliação por função, feedback e planos de evolução esportiva e humana dos atletas.',
    'critical',
    array['Nivelamentos justificados','Feedbacks entregues','Planos de evolução ativos','Decisões técnicas registradas'],
    array['Atletas avaliados','Feedbacks no prazo','Planos acompanhados','Revisões de nível'],
    'Decide avaliações e recomendações conforme a metodologia; mudanças de nível e exceções seguem a governança técnica oficial.',
    'Revisão técnica de atletas, evidências, feedbacks, progressão e necessidades de treino.'
  )
) as seed(workstream_code, code, title, mission, criticality, outcomes, indicators, authority, ritual)
join public.command_workstreams workstream on workstream.code = seed.workstream_code
on conflict (code) do update set
  workstream_id = excluded.workstream_id,
  title = excluded.title,
  mission = excluded.mission,
  criticality = excluded.criticality,
  expected_outcomes = excluded.expected_outcomes,
  performance_indicators = excluded.performance_indicators,
  decision_authority = excluded.decision_authority,
  weekly_ritual = excluded.weekly_ritual,
  active = true;
