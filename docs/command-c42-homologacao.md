# C42 — Gate de Homologação do Command

## Objetivo

Validar o Command Center consolidado sem ampliar escopo e sem remover nenhuma capacidade existente.

A C42 só pode ser considerada homologada quando o comportamento executivo novo reproduzir corretamente o estado das mesas especializadas que continuam como fonte operacional.

## Regra

- Nenhum teste autoriza remoção de módulo para simplificar a interface.
- Divergência entre resumo e módulo especializado é bloqueador.
- Dado ausente deve permanecer ausente, parcial ou explicitamente projetado.
- Nenhuma leitura executiva pode criar um estado operacional diferente do banco.
- Correções desta fase devem ser limitadas a bloqueadores, inconsistências, responsividade e clareza operacional.

## 1. Perfis e permissões

### Admin

Deve visualizar:

- Sala de controle · Hoje;
- Mesa de ação · Sessão prioritária;
- Ciclo operacional UR Play;
- Economia das sessões;
- Launch Desk e Pilot Readiness;
- Rastreabilidade das leituras;
- todos os módulos administrativos já autorizados ao perfil.

### Operator

Deve visualizar as camadas executivas compatíveis com UR Play, sem receber acesso ao Financeiro/Economia das sessões por meio do novo Command.

### Pole Manager

Deve visualizar as camadas compatíveis com sua permissão de UR Play, sem escalada de privilégio para módulos exclusivos de admin.

### Team Manager

Não deve receber acesso às camadas especializadas de UR Play caso o módulo não esteja autorizado ao seu perfil.

## 2. Sala de controle · Hoje

Validar:

- operações de hoje correspondem à Agenda;
- atletas ativos correspondem à fonte administrativa;
- atletas ainda na primeira participação correspondem ao funil real;
- cobranças vencidas e valor pendente correspondem ao Financeiro;
- alertas críticos mantêm o mesmo destino do alerta original;
- próxima decisão usa ação já gerada pelo Command;
- sinais de capacidade correspondem à Agenda/Demanda;
- base vazia não produz números inventados;
- leitura parcial permanece identificada como parcial.

## 3. Mesa de ação · Sessão prioritária

Validar em cada estado:

### Registration open

- sessão correta selecionada;
- link de Presença mantém `?session=<id>`;
- operação ainda não é apresentada como iniciada.

### Registration closed

- sessão correta permanece em foco;
- acesso à Presença aponta para a mesma sessão.

### Check-in open

- check-ins/confirmados correspondem à mesa Presença;
- pendências correspondem ao snapshot de presença;
- GO/NO-GO corresponde ao gate oficial do banco.

### In progress

- Mesa de Ação continua funcionando mesmo quando a sessão prioritária vem de Court Ops;
- não tenta inferir contadores de presença inexistentes no snapshot de Court Ops;
- Operação aponta para a mesa de quadra;
- Fechamento usa a readiness da mesma sessão.

### Completed / pós-sessão

- quando não há sessão operacional ativa, o foco passa para uma sessão ainda não fechada no Pós-Sessão 360;
- pendências e atrasos correspondem ao Pós-Sessão especializado.

## 4. Ciclo operacional UR Play

Comparar lado a lado:

- Presença no Command × `/admin/ur-play/presenca`;
- Gate de início × readiness oficial;
- Operação ao vivo × `/admin/ur-play/quadra`;
- Fechamento × `/admin/ur-play/fechamento`;
- Pós-Sessão 360 × `/admin/ur-play/pos-sessao`.

É bloqueador se qualquer número ou estado executivo divergir da fonte especializada na mesma leitura.

## 5. Riscos de estrutura

Criar ou localizar cenários com:

- sessão futura com zero quadras ativas;
- sessão futura com zero staff;
- sessão futura com quadra e staff válidos.

O Command deve destacar apenas os dois primeiros cenários como risco estrutural.

## 6. Economia das sessões

Perfil admin somente.

Validar:

- entram apenas eventos financeiros com `sessionId`;
- receita verificada não incorpora receita projetada;
- despesa verificada não incorpora despesa projetada;
- margem é a margem verificada da fonte;
- sessão negativa é destacada quando `verifiedMargin < 0`;
- ausência de evento financeiro não vira custo ou receita presumidos;
- valores da camada executiva fecham com o módulo Financeiro.

## 7. Rastreabilidade

Validar:

- horário exibido corresponde a `snapshot.generatedAt`;
- texto deixa claro que é horário de consolidação da leitura;
- estado `ready` aparece como leitura completa;
- estado `partial` aparece como leitura parcial;
- estado `empty` não é confundido com falha;
- erros de fonte continuam disponíveis na Saúde das fontes original.

## 8. Responsividade

Validar pelo menos:

- 360 px;
- 390 px;
- 430 px;
- 768 px;
- 1280 px;
- 1440 px.

Critérios:

- sem overflow horizontal da página;
- cards reorganizam em uma coluna no mobile quando necessário;
- textos não ficam sobrepostos;
- badges podem quebrar linha sem cortar conteúdo;
- links continuam clicáveis;
- informações críticas não dependem de hover;
- módulos anteriores continuam acessíveis;
- a nova camada não transforma o Command em uma tela excessivamente densa no mobile.

## 9. Estados obrigatórios

A homologação deve cobrir:

- dados reais disponíveis;
- base vazia;
- leitura parcial;
- uma sessão futura;
- sessão em check-in;
- sessão em andamento;
- sessão bloqueada para fechamento;
- sessão pronta para fechamento;
- Pós-Sessão com tarefas pendentes;
- Pós-Sessão atrasado;
- margem positiva;
- margem negativa;
- fonte financeira sem evento vinculado à sessão.

## 10. Regressão

Confirmar que continuam existentes e acessíveis, conforme permissão:

- Agenda;
- Atletas;
- Equipes;
- Financeiro;
- Comercial;
- Competições;
- Ecossistema;
- Inteligência;
- UR Play;
- Preflight;
- Presença;
- Operação de Quadra;
- Ocorrências;
- Fechamento Esportivo;
- Pós-Sessão 360;
- Desenvolvimento;
- Retenção;
- Mídia;
- Feedback/NPS;
- Launch Desk;
- Pilot Readiness;
- métricas anteriores;
- alertas e ações;
- agenda futura;
- demanda;
- funil;
- Saúde das fontes;
- Mapa do ecossistema.

## 11. Gate final

A C42 pode seguir para merge quando:

- CI estiver verde em format, lint, typecheck, testes e production build;
- nenhuma divergência entre camada executiva e fonte especializada permanecer aberta;
- não houver escalada de permissão;
- não houver overflow ou quebra funcional nos viewports homologados;
- estados vazio e parcial estiverem claros;
- fluxo prioritário de sessão apontar para a sessão correta;
- nenhum módulo anterior tiver sido removido ou tornado inacessível por regressão.

Após esse gate, qualquer nova capacidade deve sair da C42 e entrar em sprint posterior. A C42 existe para concluir e homologar o Command atual, não para reabrir escopo.
