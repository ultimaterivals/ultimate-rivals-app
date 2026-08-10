# App V1 — matriz de preservação e alimentação pelo Command

Esta matriz define o que deve ser preservado no App do Atleta e o que deve ser apenas trocado/conectado na camada de dados durante a integração final.

| Área do App | Preservar UI/UX do App | Fonte/ação canônica a usar | Relação com Command |
|---|---:|---|---|
| Player Hub `/athlete` | SIM | snapshots/serviços atuais da main + ranking + coins + próxima reserva/sessão | Command publica/opera; Hub reflete |
| Agenda `/athlete/agenda` | preservar linguagem/experiência do App; incorporar ações atuais | `set_activity_interest`, `reserve_activity_opportunity`, `cancel_activity_reservation`, `athlete_credit_balances` | Command abre demanda/confirmará sessão; atleta manifesta/reserva |
| Disponibilidade | integrar como função do App sem transformar em foco visual do Hub | `athlete_availability_windows` | Command agrega sinal para planejamento |
| Temporada | SIM | `seasons`, `season_cycles`, agenda/sessões homologadas | Command configura/homologa; App mostra campanha |
| Ranking | SIM | projeções oficiais derivadas de `ranking_transactions` | Command homologa resultado; App lê consequência |
| Arenas | SIM | `venues`, `courts`, sessões, `media_assets` elegíveis | Command cadastra/homologa; App mostra mundo físico |
| Destaques | SIM | mídia publishable/public vinculada ao atleta/temporada/arena | Command revisa/publica; App consome |
| Missões/Evolução | SIM | dados já existentes de progressão/nível/atividade; sem engine paralela | Command registra/evolui; App traduz em objetivo/progresso |
| Wallet UR Coins | SIM | `ur_coin_wallet_projection`, `ur_coin_transactions` | Command administra regras autorizadas; App lê ledger próprio |
| UR Market | SIM | ofertas públicas ativas + redemption transacional | Command administra oferta/fulfillment; App resgata |
| Perfil | SIM | atleta canônico + privacidade/autorização | Command gerencia dados internos; App mostra/edita apenas permitido |
| Equipe/Formação | SIM | memberships/rosters/formations oficiais | Command opera vínculo; App mostra contexto competitivo |
| Prévia do Atleta | interna; preservar como validação, não como parte do produto do atleta | viewer server-side read-only | Command valida exatamente o App sem impersonar |

## Regra para rotas concorrentes

Quando a `main` tiver uma rota `/athlete/*` mais recente e o PR do App tiver uma experiência mais completa para a mesma finalidade:

1. não escolher a rota pela data do commit;
2. preservar a composição visual/narrativa do App aprovado;
3. extrair da `main` as fontes, RPCs e estados transacionais mais atuais;
4. adaptar o App para consumir esses contratos;
5. remover apenas duplicações de lógica, nunca a identidade da experiência do atleta.

## Agenda — integração concreta C12/C16

A Agenda é o principal ponto de alimentação bidirecional.

### Antes da confirmação oficial

Command:
- cria oportunidade `collecting_interest`;
- define polo, modalidade, nível, formato, categoria e capacidade;
- observa disponibilidade/interesse.

App:
- atleta vê oportunidade elegível;
- pode registrar interesse;
- interesse não é reserva e não consome crédito.

### Reserva

App chama RPC transacional.

- com vaga: reserva + hold de crédito;
- sem vaga: waitlist sem hold;
- cancelamento: backend decide release/consume e promoção.

### Após confirmação UR Play (C16)

Command:
- homologa temporada/ciclos;
- converte oportunidade em sessão UR Play oficial;
- associa quadra/venue/ciclo/preço/janela de cancelamento;
- sincroniza reserva confirmada com `ur_play_registrations`.

App:
- deve continuar mostrando a mesma jornada visual;
- passa a refletir `ur_play_session`/inscrição oficial quando houver vínculo;
- próxima atividade do Player Hub deve priorizar a sessão oficial correspondente;
- não precisa conhecer os detalhes internos do gate administrativo.

## Player Hub — fontes que devem alimentar sem alterar o produto

O Hub deve receber dados derivados, não a estrutura do Command:

- próxima atividade/reserva/sessão oficial;
- estado de participação;
- ranking e movimento;
- nível/progressão;
- saldo UR Coins;
- objetivo/missão atual derivável;
- equipe/formação atual;
- arena real da próxima atividade;
- destaque/mídia elegível;
- chamada para Market/Wallet/Agenda conforme estado.

Não levar para o Hub:

- readiness de operação;
- conflitos de agenda internos;
- checklist administrativo;
- finanças internas;
- aquisição/retenção privadas;
- justificativas de override;
- auditoria;
- capacidade operacional detalhada;
- métricas de patrocinador/comercial;
- notas internas.

## Gate de integração final

Antes de qualquer merge final:

- C16 deve estar estabilizado na `main` ou sua API final deve estar congelada;
- criar branch de integração a partir da `main` atual;
- portar superfícies únicas do App sem importar migrations antigas;
- recriar Market redemption como migration forward-only sobre o head de PROD;
- adaptar Agenda/Hub às RPCs e entidades atuais;
- executar E2E bidirecional:
  - Command cria/publica → App reflete;
  - App manifesta/reserva/cancela → Command reflete;
  - Command confirma UR Play → App passa a mostrar sessão/inscrição oficial;
  - Admin Preview → App real read-only;
  - Market redemption → Wallet/Command coerentes.
