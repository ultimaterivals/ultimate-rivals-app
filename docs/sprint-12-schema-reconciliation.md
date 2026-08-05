# Sprint 12 Schema Reconciliation

Projeto Supabase homologado: `ultimate-rivals-dev` (`jrzmqlhfkhaejvmiyxzy`).

## Drift encontrado

- A migration remota `sprint_12_tournament_engine` já estava aplicada como baseline compacto.
- A versão local pretendida continha índices, constraints nomeadas e endurecimentos RLS que não estavam integralmente presentes no remoto.
- O remoto já possuía tabelas, tipos, views `security_invoker`, RLS/FORCE RLS e triggers de auditoria das tabelas de torneio.
- Faltavam ou precisavam reconciliação:
  - persistência real de `set_number` por rally;
  - agregados multi-set em `match_results`;
  - constraint de array em `match_scoring_rules.set_rules`;
  - constraints nomeadas de cancelamento e seed manual;
  - trigger append-only para `tournament_results`;
  - índices operacionais de divisões, inscrições, elencos, partidas, staff e rallies por set;
  - policies genéricas `ALL` + `SELECT` em tabelas de torneio.

## Migrations de reconciliação aplicadas

- `sprint_12_reconcile_multiset_core`
- `sprint_12_reconcile_tournament_access_function`
- `sprint_12_reconcile_tournaments_rls`
- `sprint_12_reconcile_tournament_divisions_rls`
- `sprint_12_reconcile_tournament_registrations_rls`
- `sprint_12_reconcile_tournament_matches_rls`
- `sprint_12_consolidate_remaining_tournament_rls`

## Resultado

- Não houve reset destrutivo.
- Não houve reapply da migration Sprint 12 original.
- O histórico remoto preserva a migration compacta original e adiciona apenas migrations incrementais.
- As tabelas de torneio mantêm RLS e FORCE RLS.
- Cada tabela auxiliar de torneio possui uma única policy `SELECT` autenticada e policies separadas para `INSERT`, `UPDATE` e `DELETE`.
- `tournaments` mantém uma policy pública `anon` separada para status publicáveis e uma policy autenticada consolidada.
