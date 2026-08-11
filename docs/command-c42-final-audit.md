# C42 — Command Final Audit & Control Room

## Regra de preservação

Esta sprint é estritamente aditiva.

- Não remover rotas existentes.
- Não remover módulos existentes.
- Não substituir fluxos especializados por resumos executivos.
- Não apagar dados, migrations, repositories, services, gates ou históricos.
- Melhorias de navegação devem apontar para capacidades já existentes.
- Novas camadas executivas devem funcionar como visão agregadora, não como nova fonte de verdade.

## Objetivo

Consolidar o Command Center como sala de controle operacional do Ultimate Rivals sem descaracterizar ou reduzir o sistema construído nas sprints anteriores.

A C42 adiciona camadas executivas sobre a base já existente, preservando integralmente:

- Command Center principal;
- agenda;
- atletas;
- equipes;
- financeiro;
- comercial;
- competições;
- ecossistema;
- inteligência;
- UR Play;
- preflight;
- gates de início e fechamento;
- operação de quadra;
- pós-sessão;
- disponibilidade e demanda;
- ativações;
- readiness do piloto;
- planejamento da temporada.

## Sala de controle · Hoje

Ao abrir o Command, o gestor deve conseguir identificar rapidamente:

1. Quantas operações existem hoje.
2. Quais operações exigem atenção.
3. Quantos atletas estão ativos e quantos ainda precisam chegar à segunda participação.
4. Quantas cobranças vencidas existem e qual o valor associado.
5. Se existe alerta crítico.
6. Qual é a próxima decisão recomendada pelo motor atual.
7. Se existem sinais de demanda para abertura, últimas vagas ou segunda quadra.
8. Para qual módulo especializado o gestor deve ir para executar a ação.

## Ciclo operacional UR Play

A segunda camada executiva da C42 conecta, sem substituir, as mesas especializadas já existentes.

O Command passa a resumir:

- presença: confirmados, check-ins e pendências de presença;
- gate de início: sessões em GO e NO-GO segundo a leitura oficial do banco;
- operação ao vivo: sessões em andamento, partidas em jogo e revisões pendentes;
- fechamento esportivo: sessões prontas/bloqueadas, jogos abertos e resultados pendentes;
- Pós-Sessão 360: sessões em fechamento, prontas, fechadas e atrasadas;
- integridade das leituras usadas para compor a visão executiva.

As ações continuam nos fluxos especializados:

`Presença → Gate de início → Operação de quadra → Fechamento esportivo → Pós-Sessão 360`

A camada executiva não cria novo estado nem regra paralela.

## Princípio de dados

A sala de controle não cria métricas paralelas.

A visão "Hoje" usa `AdminCommandSnapshot`, já produzido pela camada de serviço conectada às fontes administrativas reais.

O ciclo UR Play reutiliza diretamente os snapshots especializados existentes:

- `AdminAttendanceSnapshot`;
- `AdminUrPlayStartSnapshot`;
- `AdminCourtOpsSnapshot`;
- `AdminUrPlayCloseSnapshot`;
- `AdminPostSessionSnapshot`.

Estados parciais, vazios ou indisponíveis continuam explícitos. As fontes especializadas permanecem como fonte de verdade.

## Critérios de aceite C42

- [x] Preservar todos os módulos existentes.
- [x] Adicionar a camada "Sala de controle · Hoje" ao Command principal.
- [x] Usar dados das fontes reais existentes.
- [x] Exibir estados ausentes como `—` ou mensagens explícitas, sem fabricar números.
- [x] Atalhos direcionarem para módulos existentes.
- [x] Manter readiness e launch desk existentes abaixo das novas camadas.
- [x] Manter métricas, alertas, ações, agenda, demanda, funil, saúde das fontes e mapa do ecossistema existentes.
- [x] Incluir presença e gate de início na visão executiva sem duplicar regras.
- [x] Incluir operação ao vivo e pendências de fechamento.
- [x] Incluir Pós-Sessão 360 e atrasos.
- [x] Restringir a nova leitura do ciclo a perfis que já possuem acesso ao módulo UR Play.
- [ ] Validar lint, typecheck, testes e build no CI.
- [ ] Revisar render desktop/mobile com dados reais, parciais e base vazia.
- [ ] Consolidar indicadores de margem por sessão.
- [ ] Criar auditoria visual de fonte/recência para métricas críticas.
- [ ] Executar homologação real do fluxo completo do UR Play.

## Próximos incrementos

Somente de forma aditiva:

- incorporar operadores/quadras em risco com evidência operacional;
- consolidar indicadores de margem por sessão;
- adicionar atalhos contextuais mais específicos para preflight e sessão selecionada;
- criar auditoria visual de fonte/recência para métricas críticas;
- executar homologação real do fluxo completo do UR Play;
- revisar a experiência desktop/mobile sem reduzir a profundidade dos módulos especializados.
