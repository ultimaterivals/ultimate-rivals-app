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

## Mesa de ação · Sessão prioritária

A C42 adiciona uma camada contextual para reduzir navegação sem substituir nenhuma mesa operacional.

A sessão prioritária passa a oferecer atalhos diretos para:

- Presença, já apontando para a sessão selecionada;
- Gate de início com leitura GO/NO-GO do banco;
- Operação de quadra;
- Fechamento esportivo da sessão;
- Pós-Sessão 360 quando não existe sessão operacional ativa.

A mesa apenas escolhe um foco operacional usando os estados já existentes. Nenhum novo estado competitivo ou transição paralela é criado.

## Ciclo operacional UR Play

A camada executiva da C42 conecta, sem substituir, as mesas especializadas já existentes.

O Command passa a resumir:

- presença: confirmados, check-ins e pendências de presença;
- gate de início: sessões em GO e NO-GO segundo a leitura oficial do banco;
- operação ao vivo: sessões em andamento, partidas em jogo e revisões pendentes;
- fechamento esportivo: sessões prontas/bloqueadas, jogos abertos e resultados pendentes;
- Pós-Sessão 360: sessões em fechamento, prontas, fechadas e atrasadas;
- integridade das leituras usadas para compor a visão executiva;
- riscos estruturais de sessões futuras sem quadra ativa ou staff registrado.

As ações continuam nos fluxos especializados:

`Presença → Gate de início → Operação de quadra → Fechamento esportivo → Pós-Sessão 360`

A camada executiva não cria novo estado nem regra paralela.

## Economia das sessões

Para o perfil `admin`, o Command também passa a relacionar a fonte financeira existente às sessões UR Play.

A nova leitura mostra:

- receita verificada das sessões;
- despesa verificada das sessões;
- margem verificada total;
- taxa de margem quando existe receita verificada suficiente;
- quantidade de sessões com margem negativa;
- margem individual por sessão.

A regra é explícita: valores projetados e verificados permanecem separados. O Command não estima custo ausente e não transforma projeção em realizado.

## Rastreabilidade das leituras

O Command passa a exibir o horário em que o snapshot executivo foi gerado, o estado da leitura e a quantidade de fontes que reportaram falha.

A interface deixa explícito que esse horário representa o momento de consolidação do Command, e não a data de atualização de cada registro individual. Isso evita apresentar uma leitura recente como se todos os dados subjacentes tivessem sido atualizados naquele mesmo instante.

A regra de confiança permanece:

- fonte real acima de inferência;
- dado ausente não vira zero estimado;
- projeção continua identificada como projeção;
- leitura parcial continua visível como leitura parcial.

## Princípio de dados

A sala de controle não cria métricas paralelas.

A visão "Hoje" usa `AdminCommandSnapshot`, já produzido pela camada de serviço conectada às fontes administrativas reais.

O ciclo UR Play e a mesa de ação reutilizam diretamente os snapshots especializados existentes:

- `AdminAttendanceSnapshot`;
- `AdminUrPlayStartSnapshot`;
- `AdminCourtOpsSnapshot`;
- `AdminUrPlayCloseSnapshot`;
- `AdminPostSessionSnapshot`;
- `AdminUrPlaySnapshot`.

A economia das sessões reutiliza:

- `AdminFinanceSnapshot`;
- `AdminUrPlaySnapshot`.

Estados parciais, vazios ou indisponíveis continuam explícitos. As fontes especializadas permanecem como fonte de verdade.

## Homologação automatizada

A C42 agora possui uma suíte Playwright autenticada específica do Command em `tests/e2e/command.spec.ts`.

Ela valida, em desktop e mobile:

- login administrativo com credenciais fornecidas por ambiente;
- carregamento do Command;
- ausência de overflow horizontal;
- presença das camadas executivas da C42;
- acesso às rotas críticas do ciclo UR Play;
- ausência de redirecionamento indevido para login durante a navegação administrativa.

As credenciais não ficam versionadas. A suíte exige `E2E_ADMIN_EMAIL` e `E2E_ADMIN_PASSWORD`; sem essas variáveis, os testes autenticados são explicitamente ignorados em vez de gerar falso positivo com dados simulados.

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
- [x] Incorporar risco estrutural de quadra/staff usando a fonte UR Play existente.
- [x] Consolidar margem por sessão sem misturar projetado com verificado.
- [x] Restringir economia das sessões ao perfil administrativo.
- [x] Adicionar atalhos contextuais para a sessão prioritária sem substituir fluxos especializados.
- [x] Adicionar rastreabilidade do momento da leitura sem confundir leitura com atualização individual dos registros.
- [x] Validar a primeira consolidação da C42 em format, lint, typecheck, testes e build.
- [x] Corrigir a tipagem entre snapshots de Presença e Operação de Quadra na Mesa de Ação.
- [x] Revalidar o CI final após a correção de tipagem.
- [x] Adicionar suíte E2E autenticada para o Command sem versionar credenciais.
- [x] Revalidar format, lint, typecheck, testes e production build após a inclusão do E2E.
- [ ] Executar a suíte autenticada com uma conta administrativa de QA e dados reais.
- [ ] Revisar render desktop/mobile com dados reais, parciais e base vazia.
- [ ] Executar homologação real do fluxo completo do UR Play.

## Estado de conclusão

A construção funcional e a validação técnica automatizável da C42 estão concluídas. O PR deve permanecer sem merge até a homologação autenticada com conta administrativa e dados reais confirmar o fluxo ponta a ponta.

## Próxima etapa

Sem ampliar escopo funcional:

1. fornecer uma conta administrativa de QA por segredo/variável de ambiente;
2. executar `npm run test:e2e` em desktop e mobile;
3. revisar os estados real, parcial e vazio do Command;
4. homologar um UR Play real do preflight ao Pós-Sessão 360;
5. corrigir somente bloqueadores encontrados;
6. concluir a C42 e fazer merge.
