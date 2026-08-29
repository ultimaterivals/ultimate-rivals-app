# Pipeline de dados históricos — V1

Este pipeline preserva o importador existente de atletas (`admin_stage_athlete_import_batch`) e adiciona staging auditável para os demais domínios. Nenhum template contém dados reais.

## Princípios

- Todo lote declara `source_type`, `source_ref`, `source_version`, responsável/origem em `metadata` e data de staging.
- Toda linha declara `legacy_id` ou `source_id`, `canonical_keys`, `evidence` e, quando a fonte conhecer a data competitiva, `occurred_at`.
- O UR Play começou em **28/07/2026**. Essa é a referência cronológica oficial de início do UR Play, não uma data genérica para preencher jogos sem data conhecida.
- `occurred_at` pode ser `null`. Data desconhecida permanece desconhecida: nunca inferir 28/07/2026, 28/08/2026 ou qualquer outra data apenas para completar o histórico.
- `28/08/2026` não é uma data globalmente inválida. Se uma fonte confiável comprovar que um jogo ocorreu nessa data, ela deve ser preservada normalmente.
- O dry-run não escreve dados. O staging é idempotente por domínio, origem, versão e conteúdo.
- O read model final identifica uma partida histórica por `provenance + legacy_game_id`; o upsert explícito preserva a mesma identidade em reprocessamentos.
- Lotes bloqueados ficam em revisão; não há carga direta para `ranking_entries` nem `ur_coin_transactions`.
- O histórico não cria automaticamente partidas de Court Ops, Ranking Points ou UR Coins. Qualquer efeito competitivo/econômico posterior exige um fluxo explícito, revisado e auditável.
- UR Coins ficam fora desta carga. Só podem entrar por processador oficial com transação histórica compatível e evidência aprovada separadamente.

## Camada de leitura do atleta

`historical_match_results` e `historical_match_participants` são tabelas internas do read model histórico. O atleta não recebe `SELECT` direto nessas tabelas.

A superfície do App usa `get_athlete_historical_match_results(athlete_id)`, que:

- autoriza o próprio atleta ou uma Prévia do Atleta administrada;
- retorna apenas partidas em que o `athlete_id` informado consta em `historical_match_participants`;
- expõe somente o shape público necessário: ID do registro, `legacy_game_id`, `occurred_at`, lados, placar e vencedor;
- não expõe `provenance`, `source_ref`, `source_metadata`, IDs dos demais participantes, timestamps internos ou campos de governança.

## Ordem de carga

1. Atletas pelo fluxo já existente de revisão/importação.
2. Polos, categorias, equipes e vínculos.
3. Eventos/sessões, depois partidas e lados/participantes.
4. Resultados com evidência, homologação e estatísticas disponíveis.
5. Quando houver decisão formal de incorporar um histórico ao ranking, processar explicitamente a evidência pelo fluxo canônico; as projeções oficiais continuam derivadas de `ranking_transactions`.

Não inserir CSV/JSON em `ranking_entries`, snapshots ou wallet. Não alterar rankings por planilha.

## Dry-run e staging

Execute como administrador autenticado, com o JSON convertido do template:

```sql
select public.admin_historical_import_dry_run(
  'matches',
  'legacy_export',
  'matches-season-1.csv',
  '2026-08-12',
  :rows_json::jsonb
);

select public.admin_stage_historical_import_batch(
  'matches',
  'legacy_export',
  'matches-season-1.csv',
  '2026-08-12',
  '{"responsible":"Matheus","origin":"Ultimate Rivals historical export"}'::jsonb,
  :rows_json::jsonb
);
```

O relatório de inconsistências é `historical_import_rows.issues`, filtrado por `validation_status = 'blocked'`. Registros prontos continuam apenas em staging até revisão/aprovação operacional. Uma linha com `occurred_at = null` pode seguir para revisão. Datas conhecidas são aceitas quando sustentadas pela fonte; datas inválidas sintaticamente continuam bloqueadas.

## Import final do read model

Após revisão, o administrador pode materializar um resultado no read model isolado por `admin_upsert_historical_match_result(...)`.

Esse fluxo é idempotente por `provenance + legacy_game_id`. Reexecutar a mesma partida atualiza o mesmo registro, reconcilia os participantes e não cria duplicata. A função escreve somente em `historical_match_results`, `historical_match_participants` e auditoria. Ela não escreve em Court Ops, `ranking_transactions`, `ranking_entries` ou `ur_coin_transactions`.

## Arquivos requeridos

1. `athletes.csv` no template existente de atletas, com `legacy_id` estável.
2. `poles.csv` e `categories.csv`, com identificador legado, nome e evidência de origem.
3. `teams.csv`, `doubles.csv` e `team_memberships.csv`, com IDs legados de atleta/equipe/dupla e vigência.
4. `events.csv` ou `sessions.csv`, com data/hora quando conhecida, polo/local, modalidade e formato.
5. `matches.csv` com os dois lados, participantes, sessão/evento, data/hora quando conhecida e formato.
6. `results.csv` com match ID, vencedor, placar e evidência (súmula, URL, hash ou referência documental).
7. `statistics.csv`, somente se houver fonte por partida/atleta e definição de cada métrica.
8. Documento que mapeie categorias/modalidades/formatos legados para os códigos canônicos.

Arquivos modelo: `docs/templates/historical-import-*.json`.
