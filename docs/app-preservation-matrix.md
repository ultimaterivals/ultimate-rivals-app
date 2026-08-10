# App V1 — matriz de preservação e alimentação pelo Command

Esta matriz define o que deve ser preservado no App do Atleta e o que deve ser apenas trocado/conectado na camada de dados durante a integração final.

## Regra arquitetural

`COMMAND ≠ APP`

`COMMAND ↔ BACKEND CANÔNICO ↔ APP`

O Command opera, homologa, publica e audita. O App preserva sua experiência esportiva e consome somente dados e ações elegíveis ao atleta.

| Área do App | Preservar UI/UX do App | Fonte/ação canônica a usar | Relação com Command |
|---|---:|---|---|
| Player Hub `/athlete` | SIM | snapshots/serviços atuais da main + ranking + coins + próxima reserva/sessão | Command publica/opera; Hub reflete |
| Agenda `/athlete/agenda` | SIM, incorporando estados transacionais atuais | `set_activity_interest`, `reserve_activity_opportunity`, `cancel_activity_reservation`, inscrições UR Play oficiais | Command abre demanda/confirma sessão; atleta manifesta/reserva |
| Disponibilidade | integrar sem transformar em foco visual do Hub | `athlete_availability_windows` | Command agrega sinal para planejamento |
| Temporada | SIM | `seasons`, `season_cycles`, agenda/sessões homologadas | Command configura/homologa; App mostra campanha |
| Ranking | SIM | projeções oficiais derivadas de `ranking_transactions` | Command homologa resultado; App lê consequência |
| Arenas | SIM | `venues`, `courts`, sessões, `media_assets` elegíveis | Command cadastra/homologa; App mostra mundo físico |
| Destaques | SIM | mídia `publishable`/`public` vinculada ao atleta/temporada/arena | Command revisa/publica; App consome |
| Missões/Evolução | SIM | dados existentes de progressão/nível/atividade; sem engine paralela | Command registra/evolui; App traduz em objetivo/progresso |
| Wallet UR Coins | SIM | projeção/ledger de UR Coins | Command administra regras autorizadas; App lê ledger próprio |
| UR Market | SIM | ofertas públicas ativas + redemption transacional | Command administra oferta/fulfillment; App resgata |
| Perfil | SIM | atleta canônico + privacidade/autorização | Command gerencia dados internos; App mostra/edita apenas permitido |
| Equipe/Formação | SIM | memberships/rosters/formations oficiais | Command opera vínculo; App mostra contexto competitivo |
| Prévia do Atleta | preservar como validação interna read-only | viewer server-side | Command valida exatamente o App sem impersonar |
| Primeiro acesso | preservar experiência do App após autenticação | fluxo seguro C18 já incorporado à main | Command administra convite; atleta reivindica acesso |

## Regra para rotas concorrentes

Quando a `main` tiver uma rota `/athlete/*` mais recente e a linha preservada do App tiver uma experiência mais completa para a mesma finalidade:

1. não escolher a rota pela data do commit;
2. preservar a composição visual/narrativa do App aprovado;
3. extrair da `main` as fontes, RPCs e estados transacionais mais atuais;
4. adaptar o App para consumir esses contratos;
5. remover apenas duplicações de lógica, nunca a identidade da experiência do atleta.

## Agenda — contrato atual

Antes da confirmação oficial, o Command cria oportunidade, define escopo e observa disponibilidade/interesse. O App mostra oportunidade elegível e permite interesse/reserva sem expor gates internos.

Após C16, a confirmação administrativa transforma a demanda em sessão UR Play oficial, associa ciclo, quadra/venue, preço e janela de cancelamento e sincroniza reservas com `ur_play_registrations`.

Após C17, check-in/no-show e consumo de crédito são consequências operacionais canônicas. O App deve refletir apenas estados simples e autorizados: confirmado, check-in realizado, ausência quando aplicável e participação concluída.

## Player Hub — dados que devem alimentar sem alterar o produto

O Hub deve receber:

- próxima atividade/reserva/sessão oficial;
- estado de participação;
- ranking e movimento;
- nível/progressão;
- saldo UR Coins;
- objetivo/missão atual derivável;
- equipe/formação atual;
- arena real da próxima atividade;
- destaque/mídia elegível;
- chamadas para Market/Wallet/Agenda conforme estado.

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

## Ordem de implementação

1. Shell e identidade do App + Preview segura.
2. Agenda, disponibilidade, reserva, waitlist, inscrição oficial e presença.
3. Temporada, Ranking e Progressão.
4. Wallet, UR Coins e Market.
5. Arenas, Destaques e mídia publicada.
6. QA bidirecional Command ↔ Backend ↔ App.

## Estado atual do gate — 2026-08-10

- C12: incorporado — ações transacionais do atleta.
- C13: incorporado — disponibilidade agregada.
- C14/C15: incorporados — setup, homologação e abertura de demanda.
- C16: incorporado à `main` no commit `fe63077971a44c346328a14ae2c52dbbe9033f9a`.
- C17: incorporado — presença/no-show e consumo de créditos sincronizados.
- C18: incorporado — primeiro acesso seguro dos atletas.
- Branch final de integração criada a partir dessa `main`: `integration/app-v1-command-data`.

## Gate final

Antes de merge final do App:

- portar superfícies únicas do App sem importar migrations antigas fora de ordem;
- recriar Market redemption como migration forward-only posterior ao head atual de produção;
- adaptar Agenda/Hub às RPCs e entidades atuais;
- executar E2E bidirecional:
  - Command cria/publica → App reflete;
  - App manifesta/reserva/cancela → Command reflete;
  - Command confirma UR Play → App mostra sessão/inscrição oficial;
  - Command registra presença/no-show → App reflete estado autorizado;
  - Admin Preview → App real read-only;
  - Market redemption → Wallet/Command coerentes.

A integração termina quando Command e App compartilham a mesma verdade operacional sem compartilhar a mesma interface.
