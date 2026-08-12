# Parâmetros competitivos — Temporada 1

Status: auditoria V1 em 12/08/2026. Este documento descreve o comportamento
implementado; não constitui um novo regulamento nem autoriza alteração de regra.

## Princípios operacionais

- O banco de dados é a fonte de verdade para regras, vigências, resultados,
  ranking, saldo de UR Coins e auditoria.
- O frontend apresenta e solicita ações; não calcula pontuação, posição,
  desempate, saldo ou consequência competitiva.
- Alterações de temporada devem ocorrer por configuração ou processo
  administrativo rastreável, nunca por edição direta de projeções ou ledgers.
- `ranking_entries` é uma projeção descartável derivada de
  `ranking_transactions` homologadas. Não é canal de carga ou correção manual.
- `ur_coin_transactions` é append-only. UR Coins só podem ser concedidas pela
  regra ativa e pela evidência aceita pelo processador da sessão.

## Matriz de regras

| Regra                          | Classificação    | Fonte canônica / comportamento atual                                                                                              | Decisão ou pendência                                                                                                    |
| ------------------------------ | ---------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Níveis                         | CENTRALIZADA     | Enum `athlete_level`: `leveling`, `n3`, `n2`, `n1`; histórico por `athlete_levels` com vigência por temporada.                    | A lista é fechada para V1. Novos níveis exigem decisão de regulamento e migração.                                       |
| Categorias                     | CONFIGURÁVEL     | `competitive_categories` ativa/inativa categorias por código; escopo de sessão usa FK.                                            | Algumas telas validam os códigos V1 `female`, `male`, `mixed`; manter alinhado ao catálogo antes de ampliar categorias. |
| Formatos                       | CONFIGURÁVEL     | `competitive_formats` é catálogo canônico e `format_id` é FK de roster/sessão/partida.                                            | A composição V1 só implementa `doubles` e `fours`.                                                                      |
| Pontuação de ranking           | CONFIGURÁVEL     | `ranking_rules` tem temporada, vigência, versão, contexto, escopo, categoria e pontos.                                            | Alterar por nova versão vigente; não editar transações homologadas.                                                     |
| Critérios de classificação     | CENTRALIZADA     | A projeção ordena pontos, vitórias, jogos, win rate, técnicos, penalidades, instante em que alcançou a pontuação e ID.            | Critério está no motor SQL, não é editável pela UI. Mudança requer decisão formal e versão do motor.                    |
| Posição anterior/movimento     | CENTRALIZADA     | `ranking_snapshots` append-only alimenta posição anterior, variação e movimento.                                                  | Capturas e operações são auditáveis.                                                                                    |
| Mínimo para sessão             | CONFIGURÁVEL     | `capacity`, janelas e escopos ficam em `ur_play_sessions`; oportunidade contém `min_formations`.                                  | A conversão de formações para atletas usa 2/4 no Command para formatos V1.                                              |
| Composição de equipe           | CENTRALIZADA     | Roster: duplas exigem 2 titulares sem reserva; fours exige 4 titulares e até 3 reservas.                                          | Valores são guardrails de domínio V1, não campos de temporada.                                                          |
| Composição de partida          | CENTRALIZADA     | Início exige 4 participantes em doubles e 8 em fours; participantes congelam em jogo/concluído/abandonado.                        | Mudança de formato exige ampliar motor e regras, não ajustar UI.                                                        |
| Reservas                       | CENTRALIZADA     | Só fours permite até 3 reservas por lado; presença, promoção e retirada exigem motivo e operação idempotente.                     | Duplas não aceitam reserva.                                                                                             |
| Janelas de inscrição/check-in  | CONFIGURÁVEL     | `registration_opens_at`, `registration_closes_at`, `checkin_opens_at`, `checkin_closes_at` por sessão, com constraints temporais. | Admin configura datas; RPC bloqueia fora da janela.                                                                     |
| Inscrição, capacidade e espera | CENTRALIZADA     | Registro único ativo por atleta/sessão; capacidade e lista de espera são validadas em transação e a promoção é ordenada.          | Fonte é `ur_play_sessions` + `ur_play_registrations`.                                                                   |
| Cancelamento                   | CENTRALIZADA     | Cancelamento promove a primeira espera e recalcula posições; razão é persistida.                                                  | Não há janela de penalidade econômica configurável no V1.                                                               |
| W.O.                           | NÃO IMPLEMENTADA | Não há resultado competitivo específico de W.O. no motor atual.                                                                   | Decisão pendente: placar, consequência de ranking, UR Coins e auditoria antes de implementar.                           |
| Abandono                       | CENTRALIZADA     | Partida em andamento pode tornar-se `abandoned`, exigindo razão e liberando a fila conforme estado.                               | Não gera vencedor, ranking ou UR Coins automaticamente.                                                                 |
| Resultado e homologação        | CENTRALIZADA     | Rallies são fonte do placar; resultado só é homologado por fluxo administrativo.                                                  | Homologação é pré-requisito de ranking e UR Coins.                                                                      |
| Correção de rally              | CENTRALIZADA     | Correção reversível exige motivo, operação idempotente e preserva evidência.                                                      | Após revisão/homologação, reprocessamento ocorre pelo fluxo próprio.                                                    |
| Correção de ranking            | CENTRALIZADA     | Reprocessamento de partida fechada cria operação e histórico; projeção é recalculada.                                             | Não há edição manual de posição/pontos.                                                                                 |
| UR Coins                       | CONFIGURÁVEL     | `ur_coin_rule_sets` e `ur_coin_rules` possuem vigência, status, valor, direção, origem e configuração.                            | Processador V1 aceita apenas regras `match_result` da sessão UR Play concluída com todos os resultados homologados.     |
| UR Coins por derrota           | CONFIGURÁVEL     | Regra `match_loss` pode valer zero; o processador registra avaliação sem criar crédito quando valor é zero.                       | Não inferir créditos históricos.                                                                                        |
| Premiações                     | CONFIGURÁVEL     | Templates e alocações por produto/código em `tournament_prize_plan_templates` e alocações.                                        | Valores de referência em `production-reference-data.sql` são configuração de referência, não dado real.                 |
| Repasses                       | CONFIGURÁVEL     | Planos/alocações em `season_repass_plans` e `season_repass_allocations`, com snapshot de elegibilidade.                           | Publicação depende de revisão administrativa; não derivar automaticamente de ranking sem plano.                         |
| Datas da temporada             | CONFIGURÁVEL     | `seasons`, `season_cycles`, sessões e janelas carregam datas canônicas.                                                           | Não há data operacional relevante calculada no frontend.                                                                |

## Hardcodes encontrados

1. As ações e formulários administrativos validam explicitamente níveis V1,
   categorias V1 e formatos `doubles`/`fours`.
2. As telas de confirmação convertem `doubles` em 2 atletas por formação e
   `fours` em 4.
3. O motor SQL também fixa esses dois formatos para composição e início da
   partida.

Classificação: **HARDCODED CONTROLADO**, não inconsistente. São limites do
domínio esportivo V1 e coincidem com os guardrails do banco. Torná-los
“configuráveis” somente no frontend criaria uma operação inválida contra o
motor. Qualquer expansão exige decisão de regulamento, mudança transacional do
motor e testes de ranking/reservas.

## Valores de referência presentes na configuração de produção

Os valores abaixo são parâmetros de referência versionados, nunca lançamento
de resultados reais:

- Ranking UR Play: participação 8, vitória 6, derrota 2; ações técnicas e
  bônus constam em `ranking_rules` com versão e vigência.
- UR Coins: participação 4, vitória 6 e derrota 0, mediante resultados
  homologados da sessão, conforme `ur_coin_rules` ativa.
- Premiações e repasses: valores por template/plano no script de referência,
  sujeitos à configuração e homologação administrativa.

Antes de abrir uma nova temporada, o responsável deve revisar vigência,
catálogo ativo, regras de ranking, conjunto de regras de UR Coins, janelas,
capacidade, premiações e repasses no Command.

## Decisões pendentes de regulamento

- Definir W.O. (placar, vencedor, pontos, UR Coins, elegibilidade e correção).
- Definir se cancelamento tardio gera penalidade, crédito ou bloqueio; o V1
  apenas cancela e promove a espera.
- Definir procedimento de carga histórica para partidas/resultados antes de
  qualquer ranking inicial. A carga deve gerar evidências e transações
  homologadas, não inserir projeções.
