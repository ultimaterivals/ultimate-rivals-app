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

A C42 adiciona uma camada executiva "Hoje" sobre a base já existente, preservando integralmente:

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

## O que a sala de controle deve responder

Ao abrir o Command, o gestor deve conseguir identificar rapidamente:

1. Quantas operações existem hoje.
2. Quais operações exigem atenção.
3. Quantos atletas estão ativos e quantos ainda precisam chegar à segunda participação.
4. Quantas cobranças vencidas existem e qual o valor associado.
5. Se existe alerta crítico.
6. Qual é a próxima decisão recomendada pelo motor atual.
7. Se existem sinais de demanda para abertura, últimas vagas ou segunda quadra.
8. Para qual módulo especializado o gestor deve ir para executar a ação.

## Princípio de dados

A sala de controle não cria métricas paralelas.

Ela usa `AdminCommandSnapshot`, que já é produzido pela camada de serviço conectada às fontes administrativas reais. Estados parciais, vazios ou indisponíveis continuam explícitos.

## Critérios de aceite C42

- [x] Preservar todos os módulos existentes.
- [x] Adicionar a camada "Sala de controle · Hoje" ao Command principal.
- [x] Usar apenas dados já disponíveis no snapshot real.
- [x] Exibir estados ausentes como `—` ou mensagens explícitas, sem fabricar números.
- [x] Atalhos direcionarem para módulos existentes.
- [x] Manter readiness e launch desk existentes abaixo da nova camada.
- [x] Manter métricas, alertas, ações, agenda, demanda, funil, saúde das fontes e mapa do ecossistema existentes.
- [ ] Validar lint, typecheck, testes e build no CI.
- [ ] Revisar render desktop/mobile com dados reais, parciais e base vazia.
- [ ] Mapear próximos gaps P0 sem remover capacidades existentes.

## Próximos incrementos após validação

Somente de forma aditiva:

- enriquecer "Hoje" com check-in e readiness de sessão quando esses dados estiverem disponíveis no snapshot agregado;
- incluir pendências de fechamento e pós-sessão na visão executiva;
- incorporar operadores/quadras em risco;
- consolidar indicadores de margem por sessão;
- adicionar atalhos contextuais para preflight, operação ao vivo e fechamento;
- criar auditoria visual de fonte/recência para métricas críticas;
- executar homologação real do fluxo completo do UR Play.
