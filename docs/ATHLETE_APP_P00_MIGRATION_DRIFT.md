# Athlete App P00 — Auditoria de drift de migrations

- **Data da leitura:** 2026-08-28
- **Escopo:** comparação estritamente read-only entre `supabase/migrations` e o histórico de migrations do projeto Supabase Production `ultimate-rivals-prod`
- **Base Git:** `77d32b0bffb415ddc5aec66ba4856eaedefd6d67`
- **Mutação em Production:** **nenhuma**
- **Migration aplicada, removida ou renomeada:** **nenhuma**

## Resultado executivo

O inventário não representa “as mesmas 90 migrations mais uma migration extra” em Production. A diferença líquida `90 × 91` resulta de vários conjuntos simultâneos:

| Classe                                  | Quantidade |
| --------------------------------------- | ---------: |
| Mesmo nome e mesma versão               |         33 |
| Mesmo nome e versão/timestamp diferente |         52 |
| Somente no repositório                  |          5 |
| Somente no histórico de Production      |          6 |
| Total local                             |         90 |
| Total Production                        |         91 |

Portanto, **não existe uma única migration adicional que, isoladamente, explique o +1**. A explicação exata é `85` nomes compartilhados + diferenças de empacotamento/renomeação + três migrations operacionais registradas apenas em Production + duas migrations locais remanescentes: uma hardening UR Coins ainda não efetiva em Production e um revoke de equipe cujo efeito existe sem proveniência individualizada no ledger.

## Diferenças nominais

### Somente no repositório

| Versão local     | Nome                                            |
| ---------------- | ----------------------------------------------- |
| `20260812145703` | `restrict_ur_coin_direct_client_writes`         |
| `20260813090000` | `add_historical_ranking_event_helper`           |
| `20260813090500` | `fix_competition_formation_ranking_aggregation` |
| `20260813170000` | `admin_create_team`                             |
| `20260813170500` | `restrict_admin_create_team_anon`               |

### Somente em Production

| Versão Production | Nome                                                      |
| ----------------- | --------------------------------------------------------- |
| `20260810172300`  | `allow_ur_play_confirmation_to_finalize_venue`            |
| `20260811012657`  | `ur_play_incidents_safety`                                |
| `20260811012712`  | `guard_incidents_after_360_close`                         |
| `20260813152627`  | `add_private_historical_ranking_event_helper`             |
| `20260813153312`  | `fix_competition_formation_ranking_member_multiplication` |
| `20260813171349`  | `admin_create_team_function`                              |

## Reconciliação semântica dos nomes diferentes

| Repositório                                                                           | Production                                                               | Evidência read-only                                                                                                                                                                                                  | Classificação                                                    |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `20260813090000_add_historical_ranking_event_helper`                                  | `20260813152627_add_private_historical_ranking_event_helper`             | O corpo normalizado de `private.insert_historical_ranking_events` tem o mesmo MD5 (`df39dbd0c925227c87dd8e68bc479057`), mas a migration de Production revoga `EXECUTE` de `PUBLIC` e o arquivo local omite o revoke. | Nome/versão diferentes e drift real de ACL no replay local.      |
| `20260813090500_fix_competition_formation_ranking_aggregation`                        | `20260813153312_fix_competition_formation_ranking_member_multiplication` | A função `private.refresh_competition_formation_ranking_scope(uuid, uuid)` existe em Production e apresenta a mesma correção de agregação por formação/membros; as diferenças textuais observadas são de forma SQL.  | Diferença de nome e versão; equivalência semântica observada.    |
| `20260813170000_admin_create_team`                                                    | `20260813171349_admin_create_team_function`                              | A função `public.admin_create_team(text, uuid, text)` existe e o corpo observado é semanticamente o local.                                                                                                           | Diferença de nome/versão.                                        |
| Efeito incorporado em `20260810171000_confirm_ur_play_and_sync_activity_reservations` | `20260810172300_allow_ur_play_confirmation_to_finalize_venue`            | O SQL normalizado da migration de Production é idêntico ao bloco local correspondente (`e89fab1caf67042fc6b72c249fa0f739`); definições locais posteriores também preservam o efeito.                                 | Drift de granularidade/histórico, não de schema final observado. |

O arquivo local separado `20260813170500_restrict_admin_create_team_anon` não possui par nominal. O estado atual de Production é seguro (`anon`/`PUBLIC` sem execute; `authenticated` com execute), mas não há uma migration registrada posterior que individualize a origem desse hardening. Não é seguro afirmar o mecanismo pelo qual o estado foi alcançado; a proveniência permanece P1.

## Drift real

### Schema operacional de incidentes ausente do repositório

As migrations abaixo constam em Production e **não aparecem em nenhum objeto ou caminho do histórico Git auditado**:

- `20260811012657_ur_play_incidents_safety`
- `20260811012712_guard_incidents_after_360_close`

Production contém `public.ur_play_incidents`, `public.ur_play_incident_reviews` e as funções de criação, snapshot, revisão, reabertura, atualização e guarda pós-360. O código atual consulta esses objetos, inclusive em `src/server/repositories/admin-ur-play-incidents-repository.ts`, mas o repositório não contém a migration que os cria. Isso é **drift real de reprodutibilidade**: a superfície existe em Production, porém não é reconstruível apenas pela cadeia versionada atual.

### Hardening de UR Coins local ainda não refletida em Production

A migration local `20260812145703_restrict_ur_coin_direct_client_writes` está no Git desde o commit `cb6ca488db8ce100a8f4d40d28be908f918bd727`, mas não consta no histórico de Production. A leitura atual de Production confirmou:

- `authenticated` ainda possui privilégio `INSERT` em `public.ur_coin_transactions`;
- a policy `ur_coin_transactions_insert` ainda existe e restringe o insert ao papel de aplicação `admin`;
- a migration local removeria essa policy e revogaria o insert de `authenticated`.

O RLS atual reduz o alcance, mas o estado de Production ainda permite direct-write por sessão autenticada com papel admin, contrariando o contrato mais forte de que transações UR Coins só sejam geradas por processadores controlados. Pela matriz de severidade do Documento Mestre (segurança/dinheiro/integridade), o risco permanece **P0 de release**, sem correção neste P00.

### Revoke do helper histórico ausente no replay local

A migration de Production `20260813152627_add_private_historical_ranking_event_helper` revogou `EXECUTE` de `PUBLIC`; a ACL atual de Production é `{postgres=X}`. O arquivo local semanticamente pareado cria a função `SECURITY DEFINER`, mas não contém o revoke. Como `authenticated` possui `USAGE` no schema `private` e funções recebem `EXECUTE` de `PUBLIC` por padrão, um replay limpo da cadeia local pode expor o helper que lança eventos históricos de ranking. É **P0 de segurança/ranking/integridade** e deve ser resolvido forward-only, sem editar o arquivo histórico.

## Mesmos nomes, versões diferentes

Os 52 itens abaixo têm o mesmo nome lógico, mas timestamps diferentes. Isso é drift de histórico/versionamento mesmo quando o estado de schema for equivalente; nome igual não prova, sozinho, igualdade do SQL. A comparação do SQL lowercased e sem whitespace encontrou:

- 40 dos 52 retimestamps com SQL normalizado idêntico;
- 12 com conteúdo textual diferente, exigindo replay/schema diff controlado em P14: `confirm_ur_play_and_sync_activity_reservations`, `quarter_season_weeks`, `retire_legacy_season_api`, `fix_ur_play_start_format_status`, `ur_play_retention_engine`, `single_participation_per_session`, `competition_formations_and_official_doubles_ranking`, `admin_link_competition_formation_team`, `allow_audited_historical_formation_transactions`, `fix_official_individual_ranking_order`, `harden_canonical_doubles_ranking` e `harden_canonical_team_contribution`;
- no universo dos 85 nomes compartilhados, 67 SQLs normalizados idênticos e 18 diferentes.

Diferença textual não prova diferença semântica, mas impede classificar automaticamente os 12 como simples retimestamp. `retire_legacy_season_api`, por exemplo, contém um `GRANT` adicional no arquivo local.

| Nome                                                  | Versão local     | Versão Production |
| ----------------------------------------------------- | ---------------- | ----------------- |
| `confirm_ur_play_and_sync_activity_reservations`      | `20260810171000` | `20260810171948`  |
| `sync_ur_play_attendance_with_credit_ledger`          | `20260810172000` | `20260810173412`  |
| `athlete_first_access_claim_tokens`                   | `20260810173500` | `20260810174328`  |
| `sync_athlete_claim_role_with_auth`                   | `20260810174200` | `20260810180242`  |
| `admin_revoke_athlete_access_invite`                  | `20260810174500` | `20260810180329`  |
| `bootstrap_profile_during_athlete_claim`              | `20260810174800` | `20260810180628`  |
| `secure_athlete_self_matchmaking_identity`            | `20260810203500` | `20260810204343`  |
| `athlete_activation_waves`                            | `20260810211500` | `20260810210159`  |
| `wave_assisted_execution`                             | `20260810223000` | `20260810213415`  |
| `quarter_season_weeks`                                | `20260810230000` | `20260810222407`  |
| `retire_legacy_season_api`                            | `20260810234500` | `20260810224938`  |
| `ur_play_preflight`                                   | `20260811000500` | `20260810230956`  |
| `enforce_ur_play_session_start`                       | `20260811003000` | `20260810232123`  |
| `fix_ur_play_start_format_status`                     | `20260811003500` | `20260810232548`  |
| `enforce_ur_play_session_close`                       | `20260811010000` | `20260810233443`  |
| `fix_admin_confirm_ur_play_opportunity_schema`        | `20260811011500` | `20260811000129`  |
| `fix_admin_confirm_ur_play_demand_formations`         | `20260811012000` | `20260811000537`  |
| `ur_play_post_session_360`                            | `20260811020000` | `20260811003041`  |
| `ur_play_coins_by_evidence`                           | `20260811030000` | `20260811004722`  |
| `fix_ur_coin_run_completion_order`                    | `20260811030500` | `20260811005426`  |
| `ur_play_finance_by_evidence`                         | `20260811040000` | `20260811010757`  |
| `guard_finance_after_360_close`                       | `20260811040500` | `20260811011125`  |
| `ur_play_retention_engine`                            | `20260811050000` | `20260811024919`  |
| `ur_play_development_leveling`                        | `20260811060000` | `20260811131228`  |
| `secure_ur_play_development_rpcs`                     | `20260811060500` | `20260811131245`  |
| `private_ur_play_development_mutations`               | `20260811061000` | `20260811131551`  |
| `ur_play_media_operations`                            | `20260811070000` | `20260811174123`  |
| `ur_play_feedback_nps`                                | `20260811080000` | `20260811181448`  |
| `fix_feedback_private_execute`                        | `20260811080500` | `20260811181502`  |
| `historical_data_import_staging`                      | `20260812155110` | `20260813082147`  |
| `athlete_feedback_cases`                              | `20260812160000` | `20260813013245`  |
| `single_participation_per_session`                    | `20260813014000` | `20260813013759`  |
| `normalize_ranking_games_played`                      | `20260813061500` | `20260813082523`  |
| `official_individual_ranking_order`                   | `20260813063500` | `20260813083434`  |
| `competition_formations_and_official_doubles_ranking` | `20260813072000` | `20260813104523`  |
| `fix_competition_formation_pole_uuid`                 | `20260813073000` | `20260813104544`  |
| `admin_link_competition_formation_team`               | `20260813074500` | `20260813104603`  |
| `add_doubles_historical_import_domain`                | `20260813080000` | `20260813114457`  |
| `allow_audited_historical_formation_transactions`     | `20260813083000` | `20260813151011`  |
| `mirror_formation_team_to_side_ranking`               | `20260813164000` | `20260813164603`  |
| `admin_activate_team`                                 | `20260813173500` | `20260813181636`  |
| `effective_team_ranking_attribution`                  | `20260813180000` | `20260813181655`  |
| `team_ranking_from_formations`                        | `20260813183000` | `20260813182916`  |
| `historical_match_results_read_model`                 | `20260813184500` | `20260813223657`  |
| `fix_official_individual_ranking_order`               | `20260813235900` | `20260814001225`  |
| `homologate_historical_match_results`                 | `20260827003000` | `20260827033743`  |
| `historical_import_nullable_dates`                    | `20260827003100` | `20260827033808`  |
| `harden_historical_athlete_read_model`                | `20260827065000` | `20260827183657`  |
| `harden_individual_ranking_bootstrap`                 | `20260827082000` | `20260827183742`  |
| `harden_canonical_doubles_ranking`                    | `20260827103000` | `20260827183821`  |
| `harden_canonical_team_contribution`                  | `20260827131000` | `20260827183918`  |
| `fix_team_roster_parameter_ambiguity`                 | `20260827162500` | `20260827183949`  |

## Explicação aritmética do 90 × 91

1. Há 85 nomes diretamente compartilhados (`33` com versão idêntica e `52` com versão diferente).
2. Três pares renomeados fazem correspondência 1:1: helper histórico, agregação de formações e criação de equipe.
3. Restam três migrations operacionais somente em Production (venue + duas de incidentes) e duas migrations somente locais (`restrict_ur_coin_direct_client_writes` e o revoke de `anon` para criação de equipe).
4. O saldo remanescente é `3 Production - 2 local` = **+1 em Production**. O revoke local de equipe está presente no estado atual de Production, mas sua proveniência não é individualizada no histórico de migrations.

Assim, os nomes que compõem o excedente operacional de Production são `20260810172300_allow_ur_play_confirmation_to_finalize_venue`, `20260811012657_ur_play_incidents_safety` e `20260811012712_guard_incidents_after_360_close`; não é correto escolher apenas um deles como “a migration adicional”.

## Classificação e handoff

| Achado                                                                 | Classe                                                                              | Prompt responsável                                  |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------- |
| 52 timestamps diferentes para o mesmo nome                             | Drift de versionamento; equivalência de SQL ainda precisa de prova sistemática      | `P14`, confirmação em `P17`                         |
| Venue registrada só em Production, efeito final incorporado localmente | Drift de histórico/nomenclatura, sem divergência observada no corpo atual da função | `P14`                                               |
| Incidentes e guarda pós-360 existem apenas em Production               | Drift real de schema/reprodutibilidade                                              | `P14`; gate bloqueante em `P17`                     |
| Hardening UR Coins existe só local e seu efeito não está em Production | Drift real de segurança/economia                                                    | `P14`; aplicação somente após GO explícito em `P17` |
| Revoke do helper histórico não existe no arquivo local                 | Drift real de ACL no replay; risco P0 de ranking/segurança                          | `P14`; gate bloqueante em `P17`                     |
| Hardening admin team sem registro individual em Production             | Diferença de empacotamento/proveniência; ACL atual convergente                      | `P14`                                               |

Em `P14`, preparar reconciliação forward-only, idempotente e testada em ambiente isolado/dry-run. Não alterar migrations históricas, não usar direct-write e não aplicar nada em Production. `P15` fica bloqueado enquanto os P0 de migration permanecerem. Em `P17`, comparar o SHA congelado com Production, exigir backup/rollback e emitir GO/NO-GO antes de qualquer aplicação autorizada.

## Evidências preservadas

- contagem e nomes obtidos pela listagem de migrations do Supabase;
- versões locais derivadas dos nomes dos 90 arquivos em `supabase/migrations`;
- buscas em todos os objetos Git para os nomes exclusivos;
- consultas somente leitura a catálogos Postgres, ACLs, policies e definições de funções;
- nenhuma DDL, DML, migration, repair, deploy ou alteração de dados executada.
