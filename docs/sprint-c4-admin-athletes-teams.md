# Sprint C4 — Atletas e Equipes no Command

## Atletas

A listagem usa `athletes` como base oficial, mesmo quando o atleta ainda não gerou eventos de aquisição/engajamento. A view `admin_athlete_engagement` complementa o ciclo de vida.

Segmentos iniciais:

- ativos 30d;
- somente primeira participação;
- em risco entre 14 e 30 dias sem participação;
- inativos acima de 30 dias;
- atletas livres sem vínculo ativo de equipe.

## Equipes

A visão cruza `teams`, `team_report_summary`, `team_rosters`, categorias e formatos.

O limite `5 duplas por equipe/categoria/temporada` não é apenas UI: a função `private.enforce_doubles_limit` já rejeita o sexto roster do formato `doubles`. A composição também é protegida: uma dupla ativa exige exatamente dois starters e zero reservas.

## Escritas

C4 permanece read-only. Filiação, criação de duplas e recrutamento serão implementados após consolidar os fluxos transacionais e de auditoria.
