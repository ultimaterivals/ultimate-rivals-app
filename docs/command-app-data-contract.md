# Command ↔ App — contrato de alimentação de dados

## Regra arquitetural

O Command Center e o App do Atleta são superfícies independentes.

- O Command cria, edita, homologa, publica, opera e audita.
- O App do Atleta consome apenas o que é elegível para o atleta e envia apenas ações permitidas ao backend transacional.
- A integração ocorre por Supabase/Postgres, RLS, RPCs, repositories/services e entidades canônicas.
- Não compartilhar shell, navegação administrativa, linguagem interna, permissões administrativas ou complexidade operacional com o atleta.

## Fonte de verdade

Backend canônico compartilhado:

- seasons / season_cycles
- poles / venues / courts
- activity_opportunities
- activity_interests
- activity_reservations
- athlete_credit_balances / commercial credit ledger
- ur_play_sessions
- ur_play_registrations
- matches / homologation
- ranking_transactions / ranking projections
- ur_coin_transactions / wallet projection
- market_offers / market_redemptions
- teams / memberships / formations
- media_assets / highlight clips

## Contratos por domínio

### Agenda / Demanda

Command:
- configura temporada, ciclos, polos, locais e quadras;
- abre oportunidade em `collecting_interest`;
- acompanha disponibilidade agregada, interesse, formação de demanda e capacidade;
- confirma uma oportunidade como sessão oficial apenas pelos gates do backend.

App:
- mostra somente oportunidades elegíveis ao atleta;
- registra/retira interesse via `set_activity_interest`;
- reserva via `reserve_activity_opportunity`;
- cancela via `cancel_activity_reservation`;
- exibe estado pessoal, waitlist e créditos reais;
- não altera diretamente `units_used`, capacidade, status operacional ou inscrições oficiais.

### Disponibilidade

App:
- atleta registra janelas recorrentes próprias.

Command:
- consome essas janelas apenas como sinal agregado de planejamento;
- disponibilidade não equivale a interesse nem reserva.

### UR Play

Command:
- transforma demanda homologada em sessão oficial;
- gerencia sessão, inscrição, check-in, filas, quadras, staff, partida, revisão e homologação.

App:
- reflete sessão/inscrição/status do atleta;
- apresenta próxima atividade e consequências esportivas;
- não opera Court Ops.

### Ranking

Command:
- homologa resultados e permite operação autorizada do motor oficial.

App:
- leitura da projeção/ranking oficial, histórico e progressão visual;
- nunca escreve pontos diretamente.

`ranking_transactions` permanece append-only e separado de UR Coins.

### UR Coins / Wallet / Market

Command:
- administra regras autorizadas, ofertas e fulfillment de resgates.

App:
- lê saldo/histórico da wallet;
- lê somente ofertas públicas/ativas;
- resgata via RPC transacional/idempotente;
- não escreve saldo diretamente.

### Arenas

Command:
- cadastra/homologa polos, venues, courts e mídia elegível.

App:
- usa venue/court real associado à atividade;
- mostra somente dados públicos/permitidos e mídia publishable/public;
- não expõe `storage_path` privado, metadados internos ou assets draft.

### Destaques / Mídia

Command:
- registra, revisa e publica mídia.

App:
- consome apenas conteúdo elegível ao atleta e à publicação.

### Equipes / Formações

Command:
- gerencia memberships, rosters, formações e histórico.

App:
- mostra vínculo, equipe/formação e contexto competitivo permitido;
- não recebe dados privados de gestão.

### Prévia do Atleta

É ferramenta interna do Command para validação do App.

- sessão permanece `admin`;
- atleta selecionado apenas define o contexto de leitura;
- reutiliza as superfícies reais do App;
- read-only;
- sem Auth impersonation;
- sem senha de atleta;
- sem service role no browser;
- sem registrar engagement como se fosse ação real do atleta.

## Prioridade de integração

Ao integrar a linha atual da `main` com o App já construído, preservar primeiro a experiência do App e trocar apenas suas fontes/ações para os contratos canônicos atuais:

1. Agenda/participação transacional.
2. Sessão UR Play e inscrições oficiais.
3. Player Hub / próxima atividade.
4. Disponibilidade.
5. Ranking.
6. Wallet / UR Coins.
7. Market e resgate.
8. Arenas / mídia.
9. Equipes / formações.
10. Prévia administrativa.

## Regra de implementação

Quando houver duas implementações para a mesma capacidade:

- manter a UI/UX do App aprovado para rotas de atleta;
- manter a UI/UX do Command para rotas administrativas;
- escolher a fonte backend mais atual e canônica;
- adaptar repository/service/action em vez de fundir as interfaces;
- não duplicar ledger, entidade, regra esportiva ou estado operacional;
- não criar sincronização manual entre duas tabelas quando já existe RPC/trigger/entidade canônica;
- migrations novas devem ser forward-only sobre o head atual de PROD.

## Definition of Done da integração Command ↔ App

A integração só está concluída quando:

- uma alteração publicada pelo Command aparece corretamente no App quando elegível;
- uma ação permitida feita pelo atleta aparece corretamente no Command;
- não há necessidade de replicação manual de dados;
- App mantém sua experiência imersiva e navegação própria;
- Command mantém sua operação interna completa;
- RLS/roles impedem atleta de acessar Command;
- Preview é read-only e preserva sessão admin;
- ranking, créditos comerciais e UR Coins permanecem engines/ledgers independentes;
- E2E cobre Command → backend → App e App → backend → Command nos fluxos críticos.
