# Pipeline de dados históricos — V1

Este pipeline preserva o importador existente de atletas (`admin_stage_athlete_import_batch`) e adiciona staging auditável para os demais domínios. Nenhum template contém dados reais.

## Princípios

- Todo lote declara `source_type`, `source_ref`, `source_version`, responsável/origem em `metadata` e data de staging.
- Toda linha declara `legacy_id` ou `source_id`, `canonical_keys`, `evidence` e, quando competitiva, `occurred_at`.
- O dry-run não escreve dados. O staging é idempotente por domínio, origem, versão e conteúdo.
- Lotes bloqueados ficam em revisão; não há carga direta para `ranking_entries` nem `ur_coin_transactions`.
- UR Coins ficam fora desta carga. Só podem entrar por processador oficial com transação histórica compatível e evidência aprovada separadamente.

## Ordem de carga

1. Atletas pelo fluxo já existente de revisão/importação.
2. Polos, categorias, equipes e vínculos.
3. Eventos/sessões, depois partidas e lados/participantes.
4. Resultados com evidência, homologação e estatísticas disponíveis.
5. Processar cada partida homologada pelo processador de ranking; as projeções oficiais são derivadas de `ranking_transactions`.

Não inserir CSV/JSON em `ranking_entries`, snapshots ou wallet. Não alterar rankings por planilha.

## Dry-run e staging

Execute como administrador autenticado, com o JSON convertido do template:

```sql
select public.admin_historical_import_dry_run(
  'matches', 'legacy_export', 'matches-season-1.csv', '2026-08-12', :rows_json::jsonb
);

select public.admin_stage_historical_import_batch(
  'matches', 'legacy_export', 'matches-season-1.csv', '2026-08-12',
  '{"responsible":"Matheus","origin":"Ultimate Rivals historical export"}'::jsonb,
  :rows_json::jsonb
);
```

O relatório de inconsistências é `historical_import_rows.issues`, filtrado por `validation_status = 'blocked'`. Registros prontos continuam apenas em staging até revisão/aprovação operacional.

## Arquivos requeridos de Matheus

1. `athletes.csv` no template existente de atletas, com `legacy_id` estável.
2. `poles.csv` e `categories.csv`, com identificador legado, nome e evidência de origem.
3. `teams.csv`, `doubles.csv` e `team_memberships.csv`, com IDs legados de atleta/equipe/dupla e vigência.
4. `events.csv` ou `sessions.csv`, com data/hora, polo/local, modalidade e formato.
5. `matches.csv` com os dois lados, participantes, sessão/evento, data/hora e formato.
6. `results.csv` com match ID, vencedor, placar e evidência (súmula, URL, hash ou referência documental).
7. `statistics.csv`, somente se houver fonte por partida/atleta e definição de cada métrica.
8. Documento que mapeie categorias/modalidades/formatos legados para os códigos canônicos.

Arquivos modelo: `docs/templates/historical-import-*.json`.
