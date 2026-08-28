# Athlete App P00 — Matriz completa de conformidade

- **Base auditada:** `main` em `77d32b0bffb415ddc5aec66ba4856eaedefd6d67`
- **Escopo:** código, contratos e migrations existentes; nenhuma correção funcional realizada
- **Documento de referência:** `docs/ATHLETE_APP_MASTER.md`
- **Regra de classificação:** somente violações ativas recebem P0/P1/P2; capacidades ainda não construídas e atribuídas a fases oficiais são `PLANEJADO PARA PROMPT FUTURO`

| Área                         | Estado atual/evidência                                                                                                                                        | Exigência do Documento Mestre                                                               | Classificação                  | Prompt responsável                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------ | --------------------------------- |
| Command × Athlete App        | `src/app/athlete/layout.tsx` usa `AthleteShell`; contratos de integração têm testes.                                                                          | Produtos visualmente separados, compartilhando backend e contratos.                         | `CONFORME`                     | `P01`/`P16` — preservar           |
| Shell                        | `AthleteShell` existe, mas o quinto destino mobile é Temporada e há menu secundário de portal.                                                                | Início, Jogar, Ranking, Hunter e Perfil; experiência imersiva de carreira.                  | `DIVERGENTE P1`                | `P01`                             |
| Identidade/logo              | Asset oficial em `public/brand/ur-logo-official.png`; shell, metadata e manifest ainda usam monograma.                                                        | Usar a logo oficial recuperada e versionada.                                                | `DIVERGENTE P1`                | `P01`                             |
| Home                         | Snapshot, ranking, equipe, mídia e economia reais; movimento ausente vira “Posição estável”, jogos ausentes viram zero e a composição é baseada em cards.     | Player Hub com carreira em movimento, sem preencher lacunas.                                | `DIVERGENTE P1`                | `P02`/`P14`                       |
| Jogar                        | Mobile aponta para Agenda; Agenda, Disponibilidade e Arenas existem, mas estão fragmentadas.                                                                  | Jornada integrada de atividade, oportunidades, agenda, disponibilidade, arenas e inscrição. | `PLANEJADO PARA PROMPT FUTURO` | `P03`                             |
| Estados de participação      | Agenda e cards distinguem interesse, reserva, waitlist, check-in e participação; RPCs são separados.                                                          | Interest ≠ Reserve ≠ Waitlist ≠ Check-in ≠ Participation.                                   | `CONFORME`                     | `P03` — preservar                 |
| Disponibilidade              | A rota declara que disponibilidade não cria reserva, vaga ou recomendação.                                                                                    | Disponibilidade é planejamento, nunca reserva.                                              | `CONFORME`                     | `P03` — preservar/integrar        |
| Arenas                       | Consome oportunidades, venues e apenas mídia publicada; não é ainda catálogo completo.                                                                        | Arenas na jornada Jogar com identidade, localização, mídia e oportunidades reais.           | `PLANEJADO PARA PROMPT FUTURO` | `P03`                             |
| Ranking Individual           | Ranking canônico, filtros, pódio e classificação existem; faltam rival abaixo e explicabilidade completa.                                                     | Posição, movimento, rivais, pódio, classificação e critérios compreensíveis.                | `PLANEJADO PARA PROMPT FUTURO` | `P04`                             |
| Duplas                       | Ranking/formação canônicos existem; `ranking/page.tsx:67` compara `formation.entity_id` com `athleteId`, impedindo destaque pessoal correto.                  | Formação nativa, temporal, com posição e membros identificáveis.                            | `DIVERGENTE P1`                | `P04`/`P10`                       |
| Quartetos                    | Backend legado possui `fours_rankings`, formatos e rosters; motor canônico/tela ainda cobrem apenas duplas.                                                   | Quartetos nativos, temporais e visíveis.                                                    | `PLANEJADO PARA PROMPT FUTURO` | `P04`/`P10`                       |
| Resultados                   | Placar, participantes, estatísticas, homologação e impacto derivado de transações homologadas.                                                                | Resultado oficial e impacto calculado pela fonte oficial.                                   | `CONFORME`                     | `P05` — preservar/completar       |
| Histórico                    | RPC escopada; data nula aparece como “Data não registrada”; sem Coins/ranking retroativos automáticos.                                                        | Histórico homologado integra carreira e preserva datas desconhecidas.                       | `CONFORME`                     | `P05` — preservar                 |
| Temporada                    | Serviço devolve campanha, datas textuais e fases ativas hardcoded quando a fonte falha.                                                                       | Campanha, critérios, datas e elegibilidade somente de fontes vigentes.                      | `DIVERGENTE P1`                | `P06`/`P14`                       |
| Evolução                     | Mistura campos Hunter, missões, badges e zeros de fallback com evolução comum.                                                                                | Evolução esportiva comum separada do Hunter, só com métricas verificáveis.                  | `DIVERGENTE P1`                | `P07`/`P14`                       |
| Hunter                       | Não há `/athlete/hunter` na main; Hunter está embutido na Evolução.                                                                                           | Escola opt-in própria com estados explícitos.                                               | `DIVERGENTE P1`                | `P08`                             |
| Equipe                       | Memberships temporais, ranking e contribuição congelada existem; `admin_link_competition_formation_team` insere diretamente em `team_memberships` sem aceite. | Equipe central; entrada exige convite + aceite e não pode ser inferida.                     | `DIVERGENTE P0`                | `P09`/`P10`                       |
| Recrutamento                 | Não há domínio convite/aceite e a RPC administrativa produz vínculo direto.                                                                                   | Necessidade → interesse → convite → aceite/recusa → vínculo.                                | `DIVERGENTE P0`                | `P10`                             |
| Profissionalização da equipe | Estágios e checklist de estrutura não existem no Athlete App.                                                                                                 | Trilha permanente Candidate → Elite UR, sustentada por critérios reais.                     | `PLANEJADO PARA PROMPT FUTURO` | `P09`                             |
| Página pública da equipe     | Rota atual é privada e equipes oficiais aparecem apenas como badges.                                                                                          | Identidade, elenco, ranking, formações, mídia e oportunidades públicas.                     | `PLANEJADO PARA PROMPT FUTURO` | `P09`                             |
| Temporalidade de formações   | `competition_formations` possui `season_id`; ranking/contribuição congelam atribuição esportiva.                                                              | Formações por temporada/ciclo e histórico temporal correto.                                 | `CONFORME`                     | `P09`/`P10` — preservar           |
| Oportunidades                | Agenda tem oportunidades reais; `remaining_capacity ?? 0` transforma capacidade desconhecida em lotação; central multcategoria não existe.                    | Oportunidades reais, sem escassez fabricada, em oito categorias.                            | `DIVERGENTE P1`                | `P03`/`P11`/`P14`                 |
| Premiações                   | Tabelas, planos e alocações existem no backend; falta superfície completa.                                                                                    | Valores, critérios, estado e recebimento reais visíveis.                                    | `PLANEJADO PARA PROMPT FUTURO` | `P06`/`P11`                       |
| Repasses                     | Entidades auditáveis existem no backend; falta superfície do atleta/equipe.                                                                                   | Repasses reais e vigentes com disputa, homologação e recebimento distintos.                 | `PLANEJADO PARA PROMPT FUTURO` | `P11`                             |
| Economia da equipe           | Não há painel de benefícios, obrigações ou repasses.                                                                                                          | Economia conectada à profissionalização e a evidências reais.                               | `PLANEJADO PARA PROMPT FUTURO` | `P09`/`P11`                       |
| Wallet                       | Ledgers são separados; `wallet/page.tsx:9` converte fonte financeira ausente em saldo zero e não mostra erro/timeline.                                        | Saldo/extrato reais; indisponibilidade nunca vira zero.                                     | `DIVERGENTE P0`                | `P13`/`P14`                       |
| Market                       | Ofertas e resgate atômico/idempotente estão corretos; `market/page.tsx:102` converte saldo ausente em zero e usa isso no CTA.                                 | Market real e auditável sem interpretar falha financeira como saldo.                        | `DIVERGENTE P0`                | `P13`/`P14`                       |
| Perfil                       | Identidade, readiness e edição por RPC são válidas; indisponibilidade de teams vira “Atleta livre” e todo vínculo vira “Equipe Oficial”.                      | Player Card real, privacidade e vínculos comprovados.                                       | `DIVERGENTE P1`                | `P12`/`P14`                       |
| Conquistas                   | Não há domínio; o código evita uma engine paralela.                                                                                                           | Somente conquistas verificáveis por eventos reais.                                          | `PLANEJADO PARA PROMPT FUTURO` | `P07`/`P12`                       |
| Mídia                        | Highlights/Arenas filtram `publishable/public` e não expõem storage privado.                                                                                  | Mídia publicada, reconhecimentos reais e privacidade.                                       | `CONFORME`                     | `P12` — preservar/completar       |
| Notificações                 | Backend tem inbox, RLS, tipos e gatilhos; falta rota Athlete.                                                                                                 | Inbox contextual e preferências autorizadas.                                                | `PLANEJADO PARA PROMPT FUTURO` | `P12`                             |
| Onboarding                   | Claim e primeiro acesso são seguros; faltam os 11 passos esportivos e tratamento do atleta histórico.                                                         | Primeiro acesso orientado à carreira e ao histórico real.                                   | `PLANEJADO PARA PROMPT FUTURO` | `P12`/`P14`                       |
| Feedback                     | Protocolo, histórico, NPS e RPC canônica; Preview não escreve.                                                                                                | Feedback integrado, rastreável e seguro.                                                    | `CONFORME`                     | `P12`/`P16` — preservar           |
| Preview                      | Cookie admin server-side, sem troca de Auth; mutações ausentes/bloqueadas; testes read-only.                                                                  | Somente leitura, sem impersonation e sem bypass de RLS.                                     | `CONFORME`                     | `P01`/`P16` — preservar           |
| Mobile                       | Safe area e bottom nav existem; o quinto destino é Temporada e testes congelam essa arquitetura.                                                              | Mobile é referência com cinco destinos aprovados.                                           | `DIVERGENTE P1`                | `P01`                             |
| Desktop                      | Funcional/responsivo, mas sidebar extensa ainda domina como portal.                                                                                           | Adaptação do mobile agrupada por Carreira/Ecossistema.                                      | `DIVERGENTE P1`                | `P01`                             |
| Estados funcionais           | Loading, error, empty, source-health e preview existem; padronização e offline faltam.                                                                        | Loading, empty, partial, ready, error, offline e preview consistentes.                      | `PLANEJADO PARA PROMPT FUTURO` | `P01`/`P16`                       |
| Segurança/RLS                | Sessão server-side, actions com role, RLS e RPCs auditáveis; sem service role no Athlete App.                                                                 | Menor privilégio e writes somente por contratos seguros.                                    | `CONFORME`                     | `P14`/`P17` — preservar/auditar   |
| Auth/primeiro acesso         | Claim token, convite, login/reset e ligação profile/athlete existem.                                                                                          | Acesso seguro sem credencial improvisada ou impersonation.                                  | `CONFORME`                     | `P12`/`P14`/`P16` — preservar     |
| Migrations                   | 90 local × 91 Production; incidentes não são reproduzíveis pelo repo, hardening UR Coins não está em Production e helper histórico local omite revoke.        | Cadeia alinhada, forward-only e segura.                                                     | `DIVERGENTE P0`                | `P14`; gate em `P17`              |
| PWA/offline                  | Manifest e metadata existem; não há service worker, cache offline ou estado funcional offline.                                                                | Shell resiliente, leitura segura e nenhum write duplicado.                                  | `PLANEJADO PARA PROMPT FUTURO` | `P01`/`P16`                       |
| Acessibilidade               | Foco visível, reduced motion, `aria-current`, landmarks e alvos adequados aparecem em shell/componentes.                                                      | WCAG pragmático: foco, contraste, targets, labels e reduced motion.                         | `CONFORME`                     | `P01`/`P16` — preservar/validar   |
| Performance                  | SSR, consultas paralelas e `next/image`; falta orçamento/evidência Web Vitals/Lighthouse.                                                                     | Mobile rápido, mídia otimizada e medição.                                                   | `PLANEJADO PARA PROMPT FUTURO` | `P01`/`P16`                       |
| Analytics                    | Backend tem sinais operacionais; eventos do Master não estão instrumentados nas rotas Athlete.                                                                | Eventos da jornada com consentimento, sem analytics fictício.                               | `PLANEJADO PARA PROMPT FUTURO` | `P12`/`P14`/`P18`                 |
| Conteúdo/copy                | Agenda/histórico usam boa terminologia; “Missões e evolução”, “Cumprir missões” e Hunter genérico reabrem conceitos.                                          | Copy de carreira; Hunter/missões somente com contrato correspondente.                       | `DIVERGENTE P1`                | `P01`/`P07`/`P08`                 |
| Dados de lançamento          | Import staging, homologação, ondas e contratos históricos existem; reconciliação final ainda não ocorreu.                                                     | Atletas, aliases, vínculos e eventos reais reconciliados antes do piloto.                   | `PLANEJADO PARA PROMPT FUTURO` | `P14`                             |
| QA                           | Quality, Isolated QA, Visual UAT e E2E de fluxos críticos existem; testes mobile codificam Temporada como quinto destino.                                     | Evidência por SHA e UAT atleta/admin/Preview em mobile/desktop.                             | `CONFORME`                     | `P01`/`P16` — preservar/atualizar |
| Piloto/Release/Launch        | Infraestrutura existe; piloto, UAT final, audit, backup, rollback, smoke e freeze da arquitetura final não ocorreram.                                         | P0/P1 zero, piloto real, UAT, Production Audit, rollback e SHA congelado.                   | `PLANEJADO PARA PROMPT FUTURO` | `P15`–`P18`                       |

## P0, P1 e P2 estritos

### P0

- Vínculo implícito de atletas à equipe pela RPC de ligação de formação, sem convite + aceite.
- Wallet apresenta zero quando a fonte financeira está indisponível.
- Market usa esse falso zero para decidir o CTA de resgate.
- Drift de migrations: schema de incidentes não reproduzível, hardening UR Coins ausente em Production e revoke do helper histórico ausente no replay local.

### P1

- Navegação mobile, composição desktop e uso da marca divergentes.
- Fallbacks de Home que simulam estabilidade/zero.
- Identificação incorreta da formação pessoal no ranking de duplas.
- Temporada fallback apresentada como campanha ativa.
- Evolução comum misturada ao Hunter; Hunter sem rota própria na main.
- Capacidade desconhecida convertida em lotação.
- Perfil inferindo “Atleta livre” e “Equipe Oficial”.
- Copy de missões/Hunter sem contrato.
- Drift de versionamento/proveniência das migrations que não constitui, isoladamente, schema divergente.

### P2

Nenhum P2 isolado foi comprovado estaticamente na `main`. Polimento e performance medida pertencem aos prompts futuros. No PR #73, a densidade de painéis/cards em Evolução/Hunter foi registrada como P2 e não autoriza redesign no P00.

## Funcionalidades que precisam ser preservadas

- Separação entre `AthleteShell` e Command Center.
- Preview admin-only, read-only, sem impersonation ou service role.
- Identidade esportiva resolvida no servidor.
- Estados distintos e RPCs transacionais de Agenda.
- Disponibilidade separada de reserva.
- Histórico homologado com datas nulas preservadas.
- Resultados com impacto vindo do ledger oficial.
- Ranking individual, duplas e equipe derivados de projeções/ledgers canônicos.
- Formações temporais e contribuição de equipe congelada no momento esportivo.
- Ranking Points, UR Coins e créditos comerciais separados.
- Resgate Market atômico/idempotente, com estoque/limite server-side.
- Mídia somente publicável/pública.
- Perfil/readiness e edição própria por RPC.
- Feedback com protocolo e histórico.
- Asset oficial `public/brand/ur-logo-official.png`.
- Workflows Quality, Isolated QA, Visual UAT e suíte E2E.
- Loading/error/empty/source-health, foco visível e reduced motion.

O trabalho preservável e os bloqueadores específicos do PR #73 estão detalhados em `docs/ATHLETE_APP_P00_PR73_ANALYSIS.md`; o drift 90×91 está detalhado em `docs/ATHLETE_APP_P00_MIGRATION_DRIFT.md`.
