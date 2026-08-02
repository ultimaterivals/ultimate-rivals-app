# Sprint 8 — handoff

Branch: `feature/sprint-8-scoring`.

Entregas: regras configuráveis, rallies append-only, correções, placar derivado, game point, streaks, ações técnicas versionadas, resultados, revisão, homologação, correção administrativa, estatísticas, RLS, auditoria, console mobile e leitura do atleta.

Migrations:

- `20260802104936_add_pending_review_match_status.sql`
- `20260802104947_scoring_engine_rallies_results.sql`
- `20260802113020_fix_scoring_stale_sequence_error_code.sql`
- `20260802121203_index_scoring_foreign_keys.sql`

O DEV autorizado é exclusivamente `ultimate-rivals-dev` (`jrzmqlhfkhaejvmiyxzy`). Fixtures são fictícias e usam prefixo `[TEST]`. `.env.local` permanece ignorado e nenhuma service role é usada pelo app ou pelos testes.

Próximos temas possíveis pertencem a outra sprint: fila offline persistente, resolução visual de branches offline divergentes e ranking. Sprint 9 não faz parte deste handoff.
