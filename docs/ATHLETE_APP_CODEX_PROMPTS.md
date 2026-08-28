# Ultimate Rivals — Athlete App — Plano de Prompts Codex

## Documento operacional para conclusão do aplicativo

> Fonte oficial: `2-UR_ATHLETE_APP_PROMPTS_CODEX_CONCLUSAO_V1_2026-08-28.docx`
> SHA-256 da fonte: `E71F3B7D51DCD24A8082042D116232AFC5B8009E63257E3A775C5C0E0BC464B5`
> Transcrição integral versionada para continuidade do produto. Em caso de alteração estrutural, registrar ADR ou nova versão da fonte.

Versão 1.0 · Companion do Documento Mestre V3 · 28/08/2026

> FINALIDADE
> Este documento contém a sequência oficial de prompts para executar a conclusão do Athlete App com Codex em conversas separadas sem perder arquitetura, decisões ou critérios de qualidade. Cada prompt é um contrato de execução; não é convite para reabrir decisões já aprovadas.

> Regra operacional: uma conversa pode executar um ou mais prompts, mas só avançamos quando os gates do prompt anterior estiverem comprovados.

> Documento-base obrigatório: UR_ATHLETE_APP_DOCUMENTO_MESTRE_V3_2026-08-28.

## 0. COMO UTILIZAR ESTE DOCUMENTO COM CODEX

- Abra uma conversa nova apenas quando isso melhorar foco, contexto ou capacidade de execução.

- Anexe ou disponibilize o Documento Mestre V3 e este documento de prompts.

- Cole o Prompt Universal de Continuidade antes do prompt específico quando a nova conversa não possuir contexto do projeto.

- Dê ao Codex acesso ao repositório ultimaterivals/ultimate-rivals-app.

- Codex deve inspecionar o estado atual antes de alterar qualquer arquivo; nunca assumir SHA, branch ou migration pelo texto deste documento.

- Cada prompt termina com evidências: diff, testes, Quality, Isolated QA quando aplicável, UAT e SHA.

- Não executar direct-write corretivo em Production. Correções de banco passam por migration/RPC/serviço auditável.

- Não avançar para Production sem gate explícito GO.

### 0.1 Ciclo padrão de execução

1. Ler Documento Mestre e o handoff anterior.

1. Inspecionar main/branch/PR/runs atuais.

1. Declarar brevemente o plano de execução e riscos reais.

1. Implementar somente o escopo do prompt.

1. Executar format, lint, typecheck, unit tests e build.

1. Executar testes de contrato/E2E específicos.

1. Executar Isolated QA quando o prompt alterar contratos, banco, Auth, RLS ou jornadas críticas.

1. Fazer UAT visual mobile prioritário e desktop secundário quando houver UX.

1. Classificar defeitos P0/P1/P2; corrigir P0/P1, não ampliar escopo por P2.

1. Emitir handoff final com SHA, arquivos, gates, pendências e próximo prompt.

### 0.2 Definition of evidence

| Evidência          | Obrigatório                                                    |
| ------------------ | -------------------------------------------------------------- |
| SHA/branch         | Sim                                                            |
| Arquivos alterados | Sim                                                            |
| Motivo técnico     | Sim                                                            |
| Quality            | Sim, salvo prompt documental puro                              |
| Isolated QA        | Quando banco/contratos/Auth/RLS/jornada crítica forem afetados |
| Mobile UAT         | Toda mudança Athlete UX                                        |
| Desktop UAT        | Toda mudança Athlete UX, com prioridade menor                  |
| Production write   | Somente nos prompts de deploy e via mecanismo controlado       |

#### PROMPT UNIVERSAL — copiar no início de novas conversas

```text
PROMPT UNIVERSAL DE CONTINUIDADE — ULTIMATE RIVALS ATHLETE APP

Você está continuando o desenvolvimento do Athlete App do Ultimate Rivals.

REPOSITÓRIO
ultimaterivals/ultimate-rivals-app

FONTE DE VERDADE
1. Leia integralmente o Documento Mestre vigente do Athlete App.
2. Leia o documento oficial de prompts/conclusão.
3. Leia o handoff da execução anterior, se fornecido.
4. Inspecione o estado REAL do repositório, branch, PRs, migrations e CI antes de editar.

NÃO REABRIR
- Athlete App e Command Center são produtos separados.
- Athlete App usa AthleteShell.
- Preview administrativo é read-only; sem impersonation.
- RLS continua obrigatório.
- Ranking Points e UR Coins são ledgers separados.
- Histórico homologado integra a carreira.
- Datas desconhecidas não são inventadas.
- Hunter é área opt-in de desenvolvimento, não XP geral.
- Equipes são eixo central do produto.
- Duplas e quartetos são formações nativas.
- Formações são temporais/por temporada.
- Nenhuma transferência implícita; convite + aceite.
- Não criar engine paralela, score, badge, recomendação ou progressão fictícia.
- Mobile-first. Desktop é adaptação.
- Não transformar novamente o App em portal de cards/janelas.

MODO DE TRABALHO
- Preserve tudo que já estiver correto.
- Faça mudanças pequenas, rastreáveis e reversíveis.
- Prefira contratos/backend canônicos a hardcode de frontend.
- Não faça direct-write corretivo em Production.
- Se um requisito depender de uma regra inexistente, pare nesse ponto, implemente apenas a estrutura segura e registre a decisão pendente.
- Classifique problemas P0/P1/P2 e corrija somente P0/P1 no fechamento do prompt.
- Não declare teste verde sem evidência do run.

SAÍDA OBRIGATÓRIA
Ao final informe:
1. o que foi feito;
2. o que foi preservado;
3. arquivos/migrations principais;
4. testes executados e resultados;
5. UAT mobile/desktop quando aplicável;
6. P0/P1/P2;
7. SHA candidato;
8. Production tocada ou não;
9. próximo prompt recomendado.
```

## 1. MAPA DA SEQUÊNCIA OFICIAL

| Prompt | Bloco                                      | Objetivo                                                             |
| ------ | ------------------------------------------ | -------------------------------------------------------------------- |
| P00    | Bootstrap documental e baseline            | Fixar documentação, branch de trabalho e contratos de continuidade.  |
| P01    | Design System + AthleteShell V2            | Criar base mobile imersiva preservando arquitetura.                  |
| P02    | Home / Player Hub                          | Construir experiência Rumo ao Estrelato.                             |
| P03    | Jogar                                      | Unificar Agenda, oportunidades, disponibilidade e Arenas.            |
| P04    | Ranking                                    | Individual, duplas, quartetos, equipes e polos como competição viva. |
| P05    | Resultados + Histórico                     | Jornada atual e legado histórico seguros.                            |
| P06    | Temporada                                  | Campanha, critérios, premiações e caminho até Legends.               |
| P07    | Evolução                                   | Performance esportiva comum, separada do Hunter.                     |
| P08    | Hunter                                     | Escola de desenvolvimento opt-in completa no esqueleto V1.           |
| P09    | Equipes — núcleo                           | Identidade, roster, formações, contribuição e profissionalização.    |
| P10    | Recrutamento + Quartetos                   | Captação, vagas, convites, aceite e formações.                       |
| P11    | Oportunidades + Premiações + Repasses      | Dar visibilidade ao mundo de oportunidades.                          |
| P12    | Perfil + Mídia + Notificações + Onboarding | Fechar identidade, comunicação e primeiro acesso.                    |
| P13    | Wallet + Market                            | Fechar loop econômico real.                                          |
| P14    | Reconciliação de dados reais               | Atletas mestre, Auth/profile, histórico, equipes e próximos eventos. |
| P15    | Piloto E2E Production controlado           | Primeiro ciclo real nativo do novo sistema.                          |
| P16    | UAT final                                  | Atleta, admin-atleta, Preview; mobile e desktop.                     |
| P17    | Auditoria Production + Deploy              | GO/NO-GO, deploy e rollback.                                         |
| P18    | Launch Gate e congelamento V1              | Abrir uso controlado e registrar baseline oficial.                   |

## P00 — Bootstrap documental e baseline

#### PROMPT COPIÁVEL

```text
PROMPT UNIVERSAL DE CONTINUIDADE — ULTIMATE RIVALS ATHLETE APP

Você está continuando o desenvolvimento do Athlete App do Ultimate Rivals.

REPOSITÓRIO
ultimaterivals/ultimate-rivals-app

FONTE DE VERDADE
1. Leia integralmente o Documento Mestre vigente do Athlete App.
2. Leia o documento oficial de prompts/conclusão.
3. Leia o handoff da execução anterior, se fornecido.
4. Inspecione o estado REAL do repositório, branch, PRs, migrations e CI antes de editar.

NÃO REABRIR
- Athlete App e Command Center são produtos separados.
- Athlete App usa AthleteShell.
- Preview administrativo é read-only; sem impersonation.
- RLS continua obrigatório.
- Ranking Points e UR Coins são ledgers separados.
- Histórico homologado integra a carreira.
- Datas desconhecidas não são inventadas.
- Hunter é área opt-in de desenvolvimento, não XP geral.
- Equipes são eixo central do produto.
- Duplas e quartetos são formações nativas.
- Formações são temporais/por temporada.
- Nenhuma transferência implícita; convite + aceite.
- Não criar engine paralela, score, badge, recomendação ou progressão fictícia.
- Mobile-first. Desktop é adaptação.
- Não transformar novamente o App em portal de cards/janelas.

MODO DE TRABALHO
- Preserve tudo que já estiver correto.
- Faça mudanças pequenas, rastreáveis e reversíveis.
- Prefira contratos/backend canônicos a hardcode de frontend.
- Não faça direct-write corretivo em Production.
- Se um requisito depender de uma regra inexistente, pare nesse ponto, implemente apenas a estrutura segura e registre a decisão pendente.
- Classifique problemas P0/P1/P2 e corrija somente P0/P1 no fechamento do prompt.
- Não declare teste verde sem evidência do run.

SAÍDA OBRIGATÓRIA
Ao final informe:
1. o que foi feito;
2. o que foi preservado;
3. arquivos/migrations principais;
4. testes executados e resultados;
5. UAT mobile/desktop quando aplicável;
6. P0/P1/P2;
7. SHA candidato;
8. Production tocada ou não;
9. próximo prompt recomendado.


PROMPT 00 — BOOTSTRAP DOCUMENTAL E BASELINE

OBJETIVO
Preparar o repositório para que todas as próximas execuções com Codex partam da mesma fonte de verdade e não reconstruam arquitetura.

EXECUTE
1. Inspecione main, branches de UX em andamento, PRs e Quality atuais.
2. Compare o estado real com o Documento Mestre V3.
3. Adicione/atualize no repositório:
   docs/ATHLETE_APP_MASTER.md
   docs/ATHLETE_APP_CODEX_PROMPTS.md
   docs/ATHLETE_APP_RELEASE_CHECKLIST.md
   docs/ADR/README.md ou estrutura equivalente existente.
4. Registre as ADRs já aprovadas no Documento Mestre.
5. Não altere produto, banco ou Production neste prompt.
6. Identifique qualquer divergência real entre código atual e arquitetura mestre.
7. Classifique divergências P0/P1/P2 e transforme-as em backlog de execução, sem corrigi-las fora do escopo.

ACEITE
- Documentação versionada e consultável.
- Nenhuma arquitetura reaberta.
- Nenhuma migration.
- Nenhum write Production.
- Handoff com SHA documental e estado exato da branch principal.

SAÍDA
Inclua a matriz: Documento Mestre → código atual → conforme/divergente → prompt que corrigirá.
```

## P01 — Design System + AthleteShell V2

#### PROMPT COPIÁVEL

```text
PROMPT UNIVERSAL DE CONTINUIDADE — ULTIMATE RIVALS ATHLETE APP

Você está continuando o desenvolvimento do Athlete App do Ultimate Rivals.

REPOSITÓRIO
ultimaterivals/ultimate-rivals-app

FONTE DE VERDADE
1. Leia integralmente o Documento Mestre vigente do Athlete App.
2. Leia o documento oficial de prompts/conclusão.
3. Leia o handoff da execução anterior, se fornecido.
4. Inspecione o estado REAL do repositório, branch, PRs, migrations e CI antes de editar.

NÃO REABRIR
- Athlete App e Command Center são produtos separados.
- Athlete App usa AthleteShell.
- Preview administrativo é read-only; sem impersonation.
- RLS continua obrigatório.
- Ranking Points e UR Coins são ledgers separados.
- Histórico homologado integra a carreira.
- Datas desconhecidas não são inventadas.
- Hunter é área opt-in de desenvolvimento, não XP geral.
- Equipes são eixo central do produto.
- Duplas e quartetos são formações nativas.
- Formações são temporais/por temporada.
- Nenhuma transferência implícita; convite + aceite.
- Não criar engine paralela, score, badge, recomendação ou progressão fictícia.
- Mobile-first. Desktop é adaptação.
- Não transformar novamente o App em portal de cards/janelas.

MODO DE TRABALHO
- Preserve tudo que já estiver correto.
- Faça mudanças pequenas, rastreáveis e reversíveis.
- Prefira contratos/backend canônicos a hardcode de frontend.
- Não faça direct-write corretivo em Production.
- Se um requisito depender de uma regra inexistente, pare nesse ponto, implemente apenas a estrutura segura e registre a decisão pendente.
- Classifique problemas P0/P1/P2 e corrija somente P0/P1 no fechamento do prompt.
- Não declare teste verde sem evidência do run.

SAÍDA OBRIGATÓRIA
Ao final informe:
1. o que foi feito;
2. o que foi preservado;
3. arquivos/migrations principais;
4. testes executados e resultados;
5. UAT mobile/desktop quando aplicável;
6. P0/P1/P2;
7. SHA candidato;
8. Production tocada ou não;
9. próximo prompt recomendado.


PROMPT 01 — DESIGN SYSTEM MOBILE-FIRST + ATHLETESHELL V2

OBJETIVO
Criar a base visual e de navegação definitiva do Athlete App sem transformar o produto em portal de cards.

PRINCÍPIOS
- Mobile-first.
- Bottom navigation: Início | Jogar | Ranking | Hunter | Perfil.
- Hunter recebe tratamento especial, sem virar XP.
- Desktop é expansão funcional do mesmo produto.
- Usar somente a logo oficial já versionada/recuperada.
- Preservar AthleteShell e Preview read-only.

IMPLEMENTE
1. Tokens visuais, espaçamento, tipografia, superfícies, estados e motion foundations.
2. AthleteShell mobile imersivo:
   header compacto;
   safe areas;
   bottom nav persistente;
   transições discretas;
   sem menu expansível burocrático como experiência primária.
3. Desktop com navegação secundária organizada por Carreira/Ecossistema.
4. Componentes base:
   PlayerHero;
   CareerProgress;
   StatBlock;
   SeasonRoadmap;
   RankingPosition;
   MatchCard;
   OpportunityCard;
   TeamHero;
   HunterHero;
   BottomSheet;
   Skeleton;
   Empty/Error/Partial.
5. Acessibilidade e reduced motion.
6. Não mudar contratos de negócio.

UAT
- iPhone-like mobile viewport como referência principal.
- Android compacto.
- Desktop 1440px.
- Preview read-only.

ACEITE
O shell precisa parecer um aplicativo esportivo premium contínuo, não uma sequência de janelas.

GATES
Quality.
UAT visual mobile + desktop.
Sem migration e sem Production.
```

## P02 — Home / Player Hub

#### PROMPT COPIÁVEL

```text
PROMPT UNIVERSAL DE CONTINUIDADE — ULTIMATE RIVALS ATHLETE APP

Você está continuando o desenvolvimento do Athlete App do Ultimate Rivals.

REPOSITÓRIO
ultimaterivals/ultimate-rivals-app

FONTE DE VERDADE
1. Leia integralmente o Documento Mestre vigente do Athlete App.
2. Leia o documento oficial de prompts/conclusão.
3. Leia o handoff da execução anterior, se fornecido.
4. Inspecione o estado REAL do repositório, branch, PRs, migrations e CI antes de editar.

NÃO REABRIR
- Athlete App e Command Center são produtos separados.
- Athlete App usa AthleteShell.
- Preview administrativo é read-only; sem impersonation.
- RLS continua obrigatório.
- Ranking Points e UR Coins são ledgers separados.
- Histórico homologado integra a carreira.
- Datas desconhecidas não são inventadas.
- Hunter é área opt-in de desenvolvimento, não XP geral.
- Equipes são eixo central do produto.
- Duplas e quartetos são formações nativas.
- Formações são temporais/por temporada.
- Nenhuma transferência implícita; convite + aceite.
- Não criar engine paralela, score, badge, recomendação ou progressão fictícia.
- Mobile-first. Desktop é adaptação.
- Não transformar novamente o App em portal de cards/janelas.

MODO DE TRABALHO
- Preserve tudo que já estiver correto.
- Faça mudanças pequenas, rastreáveis e reversíveis.
- Prefira contratos/backend canônicos a hardcode de frontend.
- Não faça direct-write corretivo em Production.
- Se um requisito depender de uma regra inexistente, pare nesse ponto, implemente apenas a estrutura segura e registre a decisão pendente.
- Classifique problemas P0/P1/P2 e corrija somente P0/P1 no fechamento do prompt.
- Não declare teste verde sem evidência do run.

SAÍDA OBRIGATÓRIA
Ao final informe:
1. o que foi feito;
2. o que foi preservado;
3. arquivos/migrations principais;
4. testes executados e resultados;
5. UAT mobile/desktop quando aplicável;
6. P0/P1/P2;
7. SHA candidato;
8. Production tocada ou não;
9. próximo prompt recomendado.


PROMPT 02 — HOME / PLAYER HUB — RUMO AO ESTRELATO

OBJETIVO
Transformar /athlete na representação da carreira atual do atleta.

ORDEM DE HIERARQUIA
1. Identidade do atleta.
2. Campanha/temporada.
3. Próximo movimento.
4. Meu momento competitivo.
5. Ranking em movimento.
6. Equipe em movimento.
7. Oportunidades.
8. Destaques.
9. Economia/recompensas sem dominar o esporte.

USE DADOS REAIS
- nome/UR ID;
- polo/nível/categoria;
- ranking/pontos;
- jogos/vitórias/derrotas/aproveitamento;
- próxima reserva/oportunidade;
- equipe;
- UR Coins;
- destaques publicados;
- contexto de temporada.

NÃO INVENTE
sequência, distância, objetivo, conquista, progresso Hunter ou recomendação se o backend não sustentar. Quando não houver dado, orientar o próximo passo.

UX
- mobile acima da dobra deve responder: onde estou e o que faço agora?
- reduzir containers repetidos.
- criar hierarquia visual, placar, progressão e mídia.
- CTA dominante orientado ao estado real.

GATES
Contract tests para dados críticos.
Quality.
Mobile/desktop UAT.
Preview UAT.
Sem Production.
```

## P03 — Jogar

#### PROMPT COPIÁVEL

```text
PROMPT UNIVERSAL DE CONTINUIDADE — ULTIMATE RIVALS ATHLETE APP

Você está continuando o desenvolvimento do Athlete App do Ultimate Rivals.

REPOSITÓRIO
ultimaterivals/ultimate-rivals-app

FONTE DE VERDADE
1. Leia integralmente o Documento Mestre vigente do Athlete App.
2. Leia o documento oficial de prompts/conclusão.
3. Leia o handoff da execução anterior, se fornecido.
4. Inspecione o estado REAL do repositório, branch, PRs, migrations e CI antes de editar.

NÃO REABRIR
- Athlete App e Command Center são produtos separados.
- Athlete App usa AthleteShell.
- Preview administrativo é read-only; sem impersonation.
- RLS continua obrigatório.
- Ranking Points e UR Coins são ledgers separados.
- Histórico homologado integra a carreira.
- Datas desconhecidas não são inventadas.
- Hunter é área opt-in de desenvolvimento, não XP geral.
- Equipes são eixo central do produto.
- Duplas e quartetos são formações nativas.
- Formações são temporais/por temporada.
- Nenhuma transferência implícita; convite + aceite.
- Não criar engine paralela, score, badge, recomendação ou progressão fictícia.
- Mobile-first. Desktop é adaptação.
- Não transformar novamente o App em portal de cards/janelas.

MODO DE TRABALHO
- Preserve tudo que já estiver correto.
- Faça mudanças pequenas, rastreáveis e reversíveis.
- Prefira contratos/backend canônicos a hardcode de frontend.
- Não faça direct-write corretivo em Production.
- Se um requisito depender de uma regra inexistente, pare nesse ponto, implemente apenas a estrutura segura e registre a decisão pendente.
- Classifique problemas P0/P1/P2 e corrija somente P0/P1 no fechamento do prompt.
- Não declare teste verde sem evidência do run.

SAÍDA OBRIGATÓRIA
Ao final informe:
1. o que foi feito;
2. o que foi preservado;
3. arquivos/migrations principais;
4. testes executados e resultados;
5. UAT mobile/desktop quando aplicável;
6. P0/P1/P2;
7. SHA candidato;
8. Production tocada ou não;
9. próximo prompt recomendado.


PROMPT 03 — JOGAR: AGENDA + OPORTUNIDADES + DISPONIBILIDADE + ARENAS

OBJETIVO
Transformar 'Agenda' em uma experiência unificada de entrar em quadra.

ESTRUTURA
- Próxima atividade.
- Oportunidades abertas.
- Agenda.
- Disponibilidade.
- Arenas.
- Histórico de inscrições quando aplicável.

SEMÂNTICA OBRIGATÓRIA
Interest ≠ Reserve ≠ Waitlist ≠ Check-in ≠ Participation.
Disponibilidade não é reserva.
Waitlist não reserva crédito.
Crédito deve continuar seguindo contratos existentes.

IMPLEMENTE
- filtros úteis mobile;
- cards de oportunidade orientados a ação;
- bottom sheet de detalhes;
- arena/polo/endereço;
- nível/formato/categoria;
- vagas e elegibilidade;
- CTAs por estado real;
- disponibilidade dentro da jornada Jogar, não como produto isolado.

NÃO CRIAR
matching automático ou recomendação inexistente.

GATES
Testes de estado/credit semantics.
Quality.
Isolated QA se ação/contrato for alterado.
Mobile-first UAT.
Sem Production.
```

## P04 — Ranking completo

#### PROMPT COPIÁVEL

```text
PROMPT UNIVERSAL DE CONTINUIDADE — ULTIMATE RIVALS ATHLETE APP

Você está continuando o desenvolvimento do Athlete App do Ultimate Rivals.

REPOSITÓRIO
ultimaterivals/ultimate-rivals-app

FONTE DE VERDADE
1. Leia integralmente o Documento Mestre vigente do Athlete App.
2. Leia o documento oficial de prompts/conclusão.
3. Leia o handoff da execução anterior, se fornecido.
4. Inspecione o estado REAL do repositório, branch, PRs, migrations e CI antes de editar.

NÃO REABRIR
- Athlete App e Command Center são produtos separados.
- Athlete App usa AthleteShell.
- Preview administrativo é read-only; sem impersonation.
- RLS continua obrigatório.
- Ranking Points e UR Coins são ledgers separados.
- Histórico homologado integra a carreira.
- Datas desconhecidas não são inventadas.
- Hunter é área opt-in de desenvolvimento, não XP geral.
- Equipes são eixo central do produto.
- Duplas e quartetos são formações nativas.
- Formações são temporais/por temporada.
- Nenhuma transferência implícita; convite + aceite.
- Não criar engine paralela, score, badge, recomendação ou progressão fictícia.
- Mobile-first. Desktop é adaptação.
- Não transformar novamente o App em portal de cards/janelas.

MODO DE TRABALHO
- Preserve tudo que já estiver correto.
- Faça mudanças pequenas, rastreáveis e reversíveis.
- Prefira contratos/backend canônicos a hardcode de frontend.
- Não faça direct-write corretivo em Production.
- Se um requisito depender de uma regra inexistente, pare nesse ponto, implemente apenas a estrutura segura e registre a decisão pendente.
- Classifique problemas P0/P1/P2 e corrija somente P0/P1 no fechamento do prompt.
- Não declare teste verde sem evidência do run.

SAÍDA OBRIGATÓRIA
Ao final informe:
1. o que foi feito;
2. o que foi preservado;
3. arquivos/migrations principais;
4. testes executados e resultados;
5. UAT mobile/desktop quando aplicável;
6. P0/P1/P2;
7. SHA candidato;
8. Production tocada ou não;
9. próximo prompt recomendado.


PROMPT 04 — RANKING COMO COMPETIÇÃO VIVA

OBJETIVO
Entregar Ranking Individual, Duplas, Quartetos, Equipes e Polos em uma experiência coerente.

PRIORIDADE VISUAL
1. Sua posição.
2. Movimento.
3. Rival imediatamente acima/abaixo.
4. Pódio.
5. Classificação completa.
6. Critérios e explicabilidade.

BACKEND
- Ranking deve continuar derivado de ledgers/projeções canônicas.
- Não corrigir read model diretamente.
- Quartetos precisam de contrato real ou estrutura segura preparada; não fabricar pontuação.
- Rankings de equipe usam contribuição temporal correta.

FILTROS
categoria, nível, formato, polo, período/ciclo.

EXPLICABILIDADE
Mostrar pontuação, desempates, resets/ciclos e elegibilidade com linguagem atleta-first.

GATES
Contract tests de tipos de ranking.
Replay/isolated tests se houver migration ou RPC.
Quality.
Mobile/desktop UAT.
Sem Production.
```

## P05 — Resultados + Histórico

#### PROMPT COPIÁVEL

```text
PROMPT UNIVERSAL DE CONTINUIDADE — ULTIMATE RIVALS ATHLETE APP

Você está continuando o desenvolvimento do Athlete App do Ultimate Rivals.

REPOSITÓRIO
ultimaterivals/ultimate-rivals-app

FONTE DE VERDADE
1. Leia integralmente o Documento Mestre vigente do Athlete App.
2. Leia o documento oficial de prompts/conclusão.
3. Leia o handoff da execução anterior, se fornecido.
4. Inspecione o estado REAL do repositório, branch, PRs, migrations e CI antes de editar.

NÃO REABRIR
- Athlete App e Command Center são produtos separados.
- Athlete App usa AthleteShell.
- Preview administrativo é read-only; sem impersonation.
- RLS continua obrigatório.
- Ranking Points e UR Coins são ledgers separados.
- Histórico homologado integra a carreira.
- Datas desconhecidas não são inventadas.
- Hunter é área opt-in de desenvolvimento, não XP geral.
- Equipes são eixo central do produto.
- Duplas e quartetos são formações nativas.
- Formações são temporais/por temporada.
- Nenhuma transferência implícita; convite + aceite.
- Não criar engine paralela, score, badge, recomendação ou progressão fictícia.
- Mobile-first. Desktop é adaptação.
- Não transformar novamente o App em portal de cards/janelas.

MODO DE TRABALHO
- Preserve tudo que já estiver correto.
- Faça mudanças pequenas, rastreáveis e reversíveis.
- Prefira contratos/backend canônicos a hardcode de frontend.
- Não faça direct-write corretivo em Production.
- Se um requisito depender de uma regra inexistente, pare nesse ponto, implemente apenas a estrutura segura e registre a decisão pendente.
- Classifique problemas P0/P1/P2 e corrija somente P0/P1 no fechamento do prompt.
- Não declare teste verde sem evidência do run.

SAÍDA OBRIGATÓRIA
Ao final informe:
1. o que foi feito;
2. o que foi preservado;
3. arquivos/migrations principais;
4. testes executados e resultados;
5. UAT mobile/desktop quando aplicável;
6. P0/P1/P2;
7. SHA candidato;
8. Production tocada ou não;
9. próximo prompt recomendado.


PROMPT 05 — RESULTADOS ATUAIS + HISTÓRICO OFICIAL

OBJETIVO
Fazer o atleta reconhecer toda a sua trajetória competitiva, separando operação atual de importação histórica.

RESULTADOS ATUAIS
- partida;
- formação;
- adversários;
- placar;
- resultado;
- estatísticas elegíveis;
- homologação;
- impacto competitivo quando calculado.

HISTÓRICO
- preservar jogos homologados já importados;
- mostrar data somente quando comprovada;
- permitir null/desconhecida sem inventar;
- jogos históricos valem para a carreira conforme regras oficiais;
- não fabricar reserva/check-in/equipe/URC retroativos.

PRIVACIDADE
Não expor operador, evidence, provenance interna, notas ou IDs administrativos.

GATES
RPC/read-model contract.
RLS/auth tests.
Quality + Isolated QA se backend mudar.
Mobile/desktop UAT.
Sem Production.
```

## P06 — Temporada

#### PROMPT COPIÁVEL

```text
PROMPT UNIVERSAL DE CONTINUIDADE — ULTIMATE RIVALS ATHLETE APP

Você está continuando o desenvolvimento do Athlete App do Ultimate Rivals.

REPOSITÓRIO
ultimaterivals/ultimate-rivals-app

FONTE DE VERDADE
1. Leia integralmente o Documento Mestre vigente do Athlete App.
2. Leia o documento oficial de prompts/conclusão.
3. Leia o handoff da execução anterior, se fornecido.
4. Inspecione o estado REAL do repositório, branch, PRs, migrations e CI antes de editar.

NÃO REABRIR
- Athlete App e Command Center são produtos separados.
- Athlete App usa AthleteShell.
- Preview administrativo é read-only; sem impersonation.
- RLS continua obrigatório.
- Ranking Points e UR Coins são ledgers separados.
- Histórico homologado integra a carreira.
- Datas desconhecidas não são inventadas.
- Hunter é área opt-in de desenvolvimento, não XP geral.
- Equipes são eixo central do produto.
- Duplas e quartetos são formações nativas.
- Formações são temporais/por temporada.
- Nenhuma transferência implícita; convite + aceite.
- Não criar engine paralela, score, badge, recomendação ou progressão fictícia.
- Mobile-first. Desktop é adaptação.
- Não transformar novamente o App em portal de cards/janelas.

MODO DE TRABALHO
- Preserve tudo que já estiver correto.
- Faça mudanças pequenas, rastreáveis e reversíveis.
- Prefira contratos/backend canônicos a hardcode de frontend.
- Não faça direct-write corretivo em Production.
- Se um requisito depender de uma regra inexistente, pare nesse ponto, implemente apenas a estrutura segura e registre a decisão pendente.
- Classifique problemas P0/P1/P2 e corrija somente P0/P1 no fechamento do prompt.
- Não declare teste verde sem evidência do run.

SAÍDA OBRIGATÓRIA
Ao final informe:
1. o que foi feito;
2. o que foi preservado;
3. arquivos/migrations principais;
4. testes executados e resultados;
5. UAT mobile/desktop quando aplicável;
6. P0/P1/P2;
7. SHA candidato;
8. Production tocada ou não;
9. próximo prompt recomendado.


PROMPT 06 — TEMPORADA COMO CAMPANHA

OBJETIVO
Transformar /athlete/season em mapa de carreira competitiva.

JORNADA
Abertura → UR Play/Ranking → UR Series → UR Cup → UR Legends → Virada.

MOSTRAR POR ETAPA
- o que é;
- quem participa;
- critérios;
- situação do atleta/equipe;
- o que falta;
- premiação/benefício vigente;
- datas somente oficiais;
- regulamento.

PREMIAÇÕES
Dê alta visibilidade aos valores oficiais vigentes, distinguindo prêmio potencial de valor homologado/recebido.

NÃO FAZER
- não inventar datas;
- não automatizar elegibilidade inexistente;
- não criar 'percentual de classificação' sem regra.

GATES
Season context canônico.
Quality.
Mobile/desktop UAT.
Sem Production.
```

## P07 — Evolução esportiva

#### PROMPT COPIÁVEL

```text
PROMPT UNIVERSAL DE CONTINUIDADE — ULTIMATE RIVALS ATHLETE APP

Você está continuando o desenvolvimento do Athlete App do Ultimate Rivals.

REPOSITÓRIO
ultimaterivals/ultimate-rivals-app

FONTE DE VERDADE
1. Leia integralmente o Documento Mestre vigente do Athlete App.
2. Leia o documento oficial de prompts/conclusão.
3. Leia o handoff da execução anterior, se fornecido.
4. Inspecione o estado REAL do repositório, branch, PRs, migrations e CI antes de editar.

NÃO REABRIR
- Athlete App e Command Center são produtos separados.
- Athlete App usa AthleteShell.
- Preview administrativo é read-only; sem impersonation.
- RLS continua obrigatório.
- Ranking Points e UR Coins são ledgers separados.
- Histórico homologado integra a carreira.
- Datas desconhecidas não são inventadas.
- Hunter é área opt-in de desenvolvimento, não XP geral.
- Equipes são eixo central do produto.
- Duplas e quartetos são formações nativas.
- Formações são temporais/por temporada.
- Nenhuma transferência implícita; convite + aceite.
- Não criar engine paralela, score, badge, recomendação ou progressão fictícia.
- Mobile-first. Desktop é adaptação.
- Não transformar novamente o App em portal de cards/janelas.

MODO DE TRABALHO
- Preserve tudo que já estiver correto.
- Faça mudanças pequenas, rastreáveis e reversíveis.
- Prefira contratos/backend canônicos a hardcode de frontend.
- Não faça direct-write corretivo em Production.
- Se um requisito depender de uma regra inexistente, pare nesse ponto, implemente apenas a estrutura segura e registre a decisão pendente.
- Classifique problemas P0/P1/P2 e corrija somente P0/P1 no fechamento do prompt.
- Não declare teste verde sem evidência do run.

SAÍDA OBRIGATÓRIA
Ao final informe:
1. o que foi feito;
2. o que foi preservado;
3. arquivos/migrations principais;
4. testes executados e resultados;
5. UAT mobile/desktop quando aplicável;
6. P0/P1/P2;
7. SHA candidato;
8. Production tocada ou não;
9. próximo prompt recomendado.


PROMPT 07 — EVOLUÇÃO ESPORTIVA

OBJETIVO
Entregar uma área de evolução baseada em evidência esportiva normal, claramente separada do Hunter.

MOSTRAR
- nível;
- status de nivelamento;
- jogos;
- vitórias;
- aproveitamento;
- estatísticas técnicas existentes;
- evolução temporal somente quando houver série confiável;
- prioridades/revisões publicadas;
- marcos verificáveis;
- próximo passo esportivo.

NÃO MOSTRAR
- radar inventado;
- nota sem avaliação;
- score Hunter;
- percentual arbitrário;
- diagnóstico automático.

CONECTAR
Evolução → Jogar → Ranking → Temporada.
Convite opcional para conhecer Hunter.

GATES
Quality.
Mobile/desktop UAT.
Sem Production.
```

## P08 — Hunter

#### PROMPT COPIÁVEL

```text
PROMPT UNIVERSAL DE CONTINUIDADE — ULTIMATE RIVALS ATHLETE APP

Você está continuando o desenvolvimento do Athlete App do Ultimate Rivals.

REPOSITÓRIO
ultimaterivals/ultimate-rivals-app

FONTE DE VERDADE
1. Leia integralmente o Documento Mestre vigente do Athlete App.
2. Leia o documento oficial de prompts/conclusão.
3. Leia o handoff da execução anterior, se fornecido.
4. Inspecione o estado REAL do repositório, branch, PRs, migrations e CI antes de editar.

NÃO REABRIR
- Athlete App e Command Center são produtos separados.
- Athlete App usa AthleteShell.
- Preview administrativo é read-only; sem impersonation.
- RLS continua obrigatório.
- Ranking Points e UR Coins são ledgers separados.
- Histórico homologado integra a carreira.
- Datas desconhecidas não são inventadas.
- Hunter é área opt-in de desenvolvimento, não XP geral.
- Equipes são eixo central do produto.
- Duplas e quartetos são formações nativas.
- Formações são temporais/por temporada.
- Nenhuma transferência implícita; convite + aceite.
- Não criar engine paralela, score, badge, recomendação ou progressão fictícia.
- Mobile-first. Desktop é adaptação.
- Não transformar novamente o App em portal de cards/janelas.

MODO DE TRABALHO
- Preserve tudo que já estiver correto.
- Faça mudanças pequenas, rastreáveis e reversíveis.
- Prefira contratos/backend canônicos a hardcode de frontend.
- Não faça direct-write corretivo em Production.
- Se um requisito depender de uma regra inexistente, pare nesse ponto, implemente apenas a estrutura segura e registre a decisão pendente.
- Classifique problemas P0/P1/P2 e corrija somente P0/P1 no fechamento do prompt.
- Não declare teste verde sem evidência do run.

SAÍDA OBRIGATÓRIA
Ao final informe:
1. o que foi feito;
2. o que foi preservado;
3. arquivos/migrations principais;
4. testes executados e resultados;
5. UAT mobile/desktop quando aplicável;
6. P0/P1/P2;
7. SHA candidato;
8. Production tocada ou não;
9. próximo prompt recomendado.


PROMPT 08 — HUNTER — ESCOLA DE DESENVOLVIMENTO UR

OBJETIVO
Concluir o esqueleto V1 de Hunter como produto opt-in de desenvolvimento dentro do Athlete App.

ESTADOS
1. Não participante: conhece metodologia e pode manifestar interesse.
2. Interessado: vê status da solicitação se houver contrato seguro.
3. Participante: vê plano, ciclo, objetivo, prioridades, conteúdos/atividades publicados e próxima revisão.
4. Pausado/concluído: histórico do ciclo sem apagar evidência.

TRILHAS
- Mentalidade e preparação.
- Inteligência de jogo.
- Liderança e equipe.
- Evolução contínua.

PILARES
disciplina, leitura de jogo, tomada de decisão, consistência, competitividade, evolução contínua, liderança, equipe, comportamento e preparação mental.

IMPORTANTE
Se ainda não houver modelo canônico para LMS, conteúdo ou adesão, construa a arquitetura de UI/contratos mínimos sem inventar progresso. Use feedback/interesse somente se isso for explicitamente o contrato provisório aprovado; caso contrário proponha migration/RPC dedicada.

GATES
Security/RLS se criar adesão Hunter.
Quality.
Isolated QA se backend mudar.
Mobile/desktop UAT.
Sem Production.
```

## P09 — Equipes núcleo

#### PROMPT COPIÁVEL

```text
PROMPT UNIVERSAL DE CONTINUIDADE — ULTIMATE RIVALS ATHLETE APP

Você está continuando o desenvolvimento do Athlete App do Ultimate Rivals.

REPOSITÓRIO
ultimaterivals/ultimate-rivals-app

FONTE DE VERDADE
1. Leia integralmente o Documento Mestre vigente do Athlete App.
2. Leia o documento oficial de prompts/conclusão.
3. Leia o handoff da execução anterior, se fornecido.
4. Inspecione o estado REAL do repositório, branch, PRs, migrations e CI antes de editar.

NÃO REABRIR
- Athlete App e Command Center são produtos separados.
- Athlete App usa AthleteShell.
- Preview administrativo é read-only; sem impersonation.
- RLS continua obrigatório.
- Ranking Points e UR Coins são ledgers separados.
- Histórico homologado integra a carreira.
- Datas desconhecidas não são inventadas.
- Hunter é área opt-in de desenvolvimento, não XP geral.
- Equipes são eixo central do produto.
- Duplas e quartetos são formações nativas.
- Formações são temporais/por temporada.
- Nenhuma transferência implícita; convite + aceite.
- Não criar engine paralela, score, badge, recomendação ou progressão fictícia.
- Mobile-first. Desktop é adaptação.
- Não transformar novamente o App em portal de cards/janelas.

MODO DE TRABALHO
- Preserve tudo que já estiver correto.
- Faça mudanças pequenas, rastreáveis e reversíveis.
- Prefira contratos/backend canônicos a hardcode de frontend.
- Não faça direct-write corretivo em Production.
- Se um requisito depender de uma regra inexistente, pare nesse ponto, implemente apenas a estrutura segura e registre a decisão pendente.
- Classifique problemas P0/P1/P2 e corrija somente P0/P1 no fechamento do prompt.
- Não declare teste verde sem evidência do run.

SAÍDA OBRIGATÓRIA
Ao final informe:
1. o que foi feito;
2. o que foi preservado;
3. arquivos/migrations principais;
4. testes executados e resultados;
5. UAT mobile/desktop quando aplicável;
6. P0/P1/P2;
7. SHA candidato;
8. Production tocada ou não;
9. próximo prompt recomendado.


PROMPT 09 — EQUIPES — NÚCLEO DO ECOSSISTEMA

OBJETIVO
Elevar Equipe de vínculo cadastral para eixo central de carreira e profissionalização.

MINHA EQUIPE
- identidade;
- escudo;
- polo;
- história;
- roster;
- duplas;
- quartetos;
- ranking;
- resultados;
- contribuição individual;
- próximos objetivos;
- premiações/repasses homologados;
- oportunidades.

TRILHA DE PROFISSIONALIZAÇÃO
Formar → Organizar → Competir → Crescer → Profissionalizar → Tornar-se referência.

ESTÁGIOS CONCEITUAIS
Candidata → Reconhecida → Oficial → Competitiva → Destaque → Elite UR.
Não transformar estágio em score arbitrário. Critérios precisam ser objetivos/configuráveis.

STATUS OFICIAL
- candidatura pode ser iniciada por atleta confirmado/responsável aprovado;
- oficialização depende do UR;
- vagas podem ser limitadas por polo/categoria com base em capacidade real.

PÁGINA PÚBLICA
Somente dados publicáveis: identidade, roster autorizado, formações, ranking, resultados, conquistas, vagas.

GATES
Preservar atribuição temporal de team_memberships.
Quality.
Isolated QA se schema/RPC mudar.
Mobile/desktop UAT.
Sem Production.
```

## P10 — Recrutamento + Quartetos

#### PROMPT COPIÁVEL

```text
PROMPT UNIVERSAL DE CONTINUIDADE — ULTIMATE RIVALS ATHLETE APP

Você está continuando o desenvolvimento do Athlete App do Ultimate Rivals.

REPOSITÓRIO
ultimaterivals/ultimate-rivals-app

FONTE DE VERDADE
1. Leia integralmente o Documento Mestre vigente do Athlete App.
2. Leia o documento oficial de prompts/conclusão.
3. Leia o handoff da execução anterior, se fornecido.
4. Inspecione o estado REAL do repositório, branch, PRs, migrations e CI antes de editar.

NÃO REABRIR
- Athlete App e Command Center são produtos separados.
- Athlete App usa AthleteShell.
- Preview administrativo é read-only; sem impersonation.
- RLS continua obrigatório.
- Ranking Points e UR Coins são ledgers separados.
- Histórico homologado integra a carreira.
- Datas desconhecidas não são inventadas.
- Hunter é área opt-in de desenvolvimento, não XP geral.
- Equipes são eixo central do produto.
- Duplas e quartetos são formações nativas.
- Formações são temporais/por temporada.
- Nenhuma transferência implícita; convite + aceite.
- Não criar engine paralela, score, badge, recomendação ou progressão fictícia.
- Mobile-first. Desktop é adaptação.
- Não transformar novamente o App em portal de cards/janelas.

MODO DE TRABALHO
- Preserve tudo que já estiver correto.
- Faça mudanças pequenas, rastreáveis e reversíveis.
- Prefira contratos/backend canônicos a hardcode de frontend.
- Não faça direct-write corretivo em Production.
- Se um requisito depender de uma regra inexistente, pare nesse ponto, implemente apenas a estrutura segura e registre a decisão pendente.
- Classifique problemas P0/P1/P2 e corrija somente P0/P1 no fechamento do prompt.
- Não declare teste verde sem evidência do run.

SAÍDA OBRIGATÓRIA
Ao final informe:
1. o que foi feito;
2. o que foi preservado;
3. arquivos/migrations principais;
4. testes executados e resultados;
5. UAT mobile/desktop quando aplicável;
6. P0/P1/P2;
7. SHA candidato;
8. Production tocada ou não;
9. próximo prompt recomendado.


PROMPT 10 — RECRUTAMENTO, DUPLAS E QUARTETOS

OBJETIVO
Criar a trilha de crescimento das equipes por captação e formações competitivas.

RECRUTAMENTO
- equipe publica necessidade;
- atleta pode manifestar interesse;
- equipe envia convite;
- atleta aceita/recusa;
- mudança efetiva somente pelo fluxo aprovado;
- nenhuma transferência implícita;
- preparar arquitetura para janela de transferências futura.

FORMAÇÕES
Duplas e Quartetos:
- feminino;
- masculino;
- misto;
- em montagem;
- completa;
- elegível;
- ativa;
- encerrada/inativa.

TEMPORALIDADE
Formação é da temporada/ciclo. Vínculo histórico não deve ser reescrito.

UX DE CRESCIMENTO
Destaque equipe com vagas, quarteto incompleto, novas categorias e necessidade por nível/polo.

BACKEND
Se não houver tabelas/RPCs suficientes, criar migrations forward-only e RLS. Não modelar com campos genéricos frágeis só para acelerar.

GATES
Roster limits.
Invitation/acceptance contracts.
RLS.
Replay migration.
Quality + Isolated QA.
Mobile/desktop UAT.
Sem Production.
```

## P11 — Oportunidades, premiações e repasses

#### PROMPT COPIÁVEL

```text
PROMPT UNIVERSAL DE CONTINUIDADE — ULTIMATE RIVALS ATHLETE APP

Você está continuando o desenvolvimento do Athlete App do Ultimate Rivals.

REPOSITÓRIO
ultimaterivals/ultimate-rivals-app

FONTE DE VERDADE
1. Leia integralmente o Documento Mestre vigente do Athlete App.
2. Leia o documento oficial de prompts/conclusão.
3. Leia o handoff da execução anterior, se fornecido.
4. Inspecione o estado REAL do repositório, branch, PRs, migrations e CI antes de editar.

NÃO REABRIR
- Athlete App e Command Center são produtos separados.
- Athlete App usa AthleteShell.
- Preview administrativo é read-only; sem impersonation.
- RLS continua obrigatório.
- Ranking Points e UR Coins são ledgers separados.
- Histórico homologado integra a carreira.
- Datas desconhecidas não são inventadas.
- Hunter é área opt-in de desenvolvimento, não XP geral.
- Equipes são eixo central do produto.
- Duplas e quartetos são formações nativas.
- Formações são temporais/por temporada.
- Nenhuma transferência implícita; convite + aceite.
- Não criar engine paralela, score, badge, recomendação ou progressão fictícia.
- Mobile-first. Desktop é adaptação.
- Não transformar novamente o App em portal de cards/janelas.

MODO DE TRABALHO
- Preserve tudo que já estiver correto.
- Faça mudanças pequenas, rastreáveis e reversíveis.
- Prefira contratos/backend canônicos a hardcode de frontend.
- Não faça direct-write corretivo em Production.
- Se um requisito depender de uma regra inexistente, pare nesse ponto, implemente apenas a estrutura segura e registre a decisão pendente.
- Classifique problemas P0/P1/P2 e corrija somente P0/P1 no fechamento do prompt.
- Não declare teste verde sem evidência do run.

SAÍDA OBRIGATÓRIA
Ao final informe:
1. o que foi feito;
2. o que foi preservado;
3. arquivos/migrations principais;
4. testes executados e resultados;
5. UAT mobile/desktop quando aplicável;
6. P0/P1/P2;
7. SHA candidato;
8. Production tocada ou não;
9. próximo prompt recomendado.


PROMPT 11 — CENTRAL DE OPORTUNIDADES + PREMIAÇÕES + REPASSES

OBJETIVO
Mostrar que Ultimate Rivals é um ecossistema de oportunidades, não apenas uma liga.

CENTRAL DE OPORTUNIDADES
Categorias:
- competição;
- financeiro;
- desenvolvimento;
- mídia;
- parceiros;
- equipe;
- recompensas;
- carreira.

PARA ATLETAS
prêmios, MVP, melhor ranking, UR Coins, Market, Hunter, mídia, experiências, parceiros, convites.

PARA EQUIPES
repasses, premiações, mídia, ativações, patrocínios, treinamento, liderança, expansão, vagas oficiais.

UX
- alta visibilidade na Home, Temporada e Equipe;
- distinguir 'em disputa', 'elegível', 'homologado' e 'recebido';
- nunca mostrar repasse estimado como dívida;
- não prometer benefício sem ativo/regra real.

BACKEND
Preferir catálogo/configuração canônica para oportunidades. Se V1 for editorial, deixar claro o que é conteúdo publicado vs entitlement calculado.

GATES
Contract tests de status financeiro/oportunidade.
Quality.
Isolated QA se economic/RPC schema mudar.
Mobile/desktop UAT.
Sem Production.
```

## P12 — Perfil, mídia, notificações e onboarding

#### PROMPT COPIÁVEL

```text
PROMPT UNIVERSAL DE CONTINUIDADE — ULTIMATE RIVALS ATHLETE APP

Você está continuando o desenvolvimento do Athlete App do Ultimate Rivals.

REPOSITÓRIO
ultimaterivals/ultimate-rivals-app

FONTE DE VERDADE
1. Leia integralmente o Documento Mestre vigente do Athlete App.
2. Leia o documento oficial de prompts/conclusão.
3. Leia o handoff da execução anterior, se fornecido.
4. Inspecione o estado REAL do repositório, branch, PRs, migrations e CI antes de editar.

NÃO REABRIR
- Athlete App e Command Center são produtos separados.
- Athlete App usa AthleteShell.
- Preview administrativo é read-only; sem impersonation.
- RLS continua obrigatório.
- Ranking Points e UR Coins são ledgers separados.
- Histórico homologado integra a carreira.
- Datas desconhecidas não são inventadas.
- Hunter é área opt-in de desenvolvimento, não XP geral.
- Equipes são eixo central do produto.
- Duplas e quartetos são formações nativas.
- Formações são temporais/por temporada.
- Nenhuma transferência implícita; convite + aceite.
- Não criar engine paralela, score, badge, recomendação ou progressão fictícia.
- Mobile-first. Desktop é adaptação.
- Não transformar novamente o App em portal de cards/janelas.

MODO DE TRABALHO
- Preserve tudo que já estiver correto.
- Faça mudanças pequenas, rastreáveis e reversíveis.
- Prefira contratos/backend canônicos a hardcode de frontend.
- Não faça direct-write corretivo em Production.
- Se um requisito depender de uma regra inexistente, pare nesse ponto, implemente apenas a estrutura segura e registre a decisão pendente.
- Classifique problemas P0/P1/P2 e corrija somente P0/P1 no fechamento do prompt.
- Não declare teste verde sem evidência do run.

SAÍDA OBRIGATÓRIA
Ao final informe:
1. o que foi feito;
2. o que foi preservado;
3. arquivos/migrations principais;
4. testes executados e resultados;
5. UAT mobile/desktop quando aplicável;
6. P0/P1/P2;
7. SHA candidato;
8. Production tocada ou não;
9. próximo prompt recomendado.


PROMPT 12 — PERFIL + MÍDIA + NOTIFICAÇÕES + ONBOARDING

OBJETIVO
Fechar identidade, primeiro acesso e comunicação do atleta.

PERFIL / PLAYER CARD
- foto aprovada;
- nome/UR ID;
- polo;
- nível/categoria;
- equipe/formação;
- ranking;
- estatísticas;
- conquistas reais;
- destaques publicados;
- bio esportiva opcional.

PERFIL PÚBLICO
Nunca expor email, telefone, disponibilidade, pagamentos ou feedback.

MÍDIA
Usar somente assets publishable/public.

NOTIFICAÇÕES
Preparar/implementar categorias:
Jogar, Competição, Temporada, Equipe, Hunter, Economia, Mídia, Suporte.
Não criar push se não houver infraestrutura; inbox in-app pode ser fase inicial.

ONBOARDING
Diferenciar atleta novo de atleta histórico.
Mensagem para histórico: 'Você já faz parte da história.'
Confirmar identidade, mostrar dados existentes, temporada, ranking, disponibilidade, Jogar, Equipe e Hunter opcional.

GATES
Auth/profile privacy.
Media privacy.
Quality.
Isolated QA se schema/RLS mudar.
Mobile/desktop UAT.
Sem Production.
```

## P13 — Wallet + Market

#### PROMPT COPIÁVEL

```text
PROMPT UNIVERSAL DE CONTINUIDADE — ULTIMATE RIVALS ATHLETE APP

Você está continuando o desenvolvimento do Athlete App do Ultimate Rivals.

REPOSITÓRIO
ultimaterivals/ultimate-rivals-app

FONTE DE VERDADE
1. Leia integralmente o Documento Mestre vigente do Athlete App.
2. Leia o documento oficial de prompts/conclusão.
3. Leia o handoff da execução anterior, se fornecido.
4. Inspecione o estado REAL do repositório, branch, PRs, migrations e CI antes de editar.

NÃO REABRIR
- Athlete App e Command Center são produtos separados.
- Athlete App usa AthleteShell.
- Preview administrativo é read-only; sem impersonation.
- RLS continua obrigatório.
- Ranking Points e UR Coins são ledgers separados.
- Histórico homologado integra a carreira.
- Datas desconhecidas não são inventadas.
- Hunter é área opt-in de desenvolvimento, não XP geral.
- Equipes são eixo central do produto.
- Duplas e quartetos são formações nativas.
- Formações são temporais/por temporada.
- Nenhuma transferência implícita; convite + aceite.
- Não criar engine paralela, score, badge, recomendação ou progressão fictícia.
- Mobile-first. Desktop é adaptação.
- Não transformar novamente o App em portal de cards/janelas.

MODO DE TRABALHO
- Preserve tudo que já estiver correto.
- Faça mudanças pequenas, rastreáveis e reversíveis.
- Prefira contratos/backend canônicos a hardcode de frontend.
- Não faça direct-write corretivo em Production.
- Se um requisito depender de uma regra inexistente, pare nesse ponto, implemente apenas a estrutura segura e registre a decisão pendente.
- Classifique problemas P0/P1/P2 e corrija somente P0/P1 no fechamento do prompt.
- Não declare teste verde sem evidência do run.

SAÍDA OBRIGATÓRIA
Ao final informe:
1. o que foi feito;
2. o que foi preservado;
3. arquivos/migrations principais;
4. testes executados e resultados;
5. UAT mobile/desktop quando aplicável;
6. P0/P1/P2;
7. SHA candidato;
8. Production tocada ou não;
9. próximo prompt recomendado.


PROMPT 13 — WALLET URC + UR MARKET

OBJETIVO
Fechar o loop econômico sem misturar UR Coins e Ranking Points.

WALLET
- saldo;
- ganhos;
- gastos;
- origem;
- data;
- referência;
- regras.

MARKET
- vitrine real;
- detalhe;
- preço URC;
- estoque;
- limite;
- validade;
- resgate;
- fulfillment/código;
- meus resgates.

INTEGRIDADE
- idempotência;
- saldo nunca negativo;
- debit/credit auditável;
- sem edição manual de saldo;
- no retry duplication;
- inventory limits server-side.

CONTEÚDO
Market vazio é aceitável até existirem ofertas reais. Não criar produtos fictícios para preencher UI.

GATES
Economic ledger tests.
RLS/RPC.
Concurrency/idempotency tests.
Quality + Isolated QA.
Mobile UAT.
Sem Production.
```

## P14 — Reconciliação de dados reais e ativação

#### PROMPT COPIÁVEL

```text
PROMPT UNIVERSAL DE CONTINUIDADE — ULTIMATE RIVALS ATHLETE APP

Você está continuando o desenvolvimento do Athlete App do Ultimate Rivals.

REPOSITÓRIO
ultimaterivals/ultimate-rivals-app

FONTE DE VERDADE
1. Leia integralmente o Documento Mestre vigente do Athlete App.
2. Leia o documento oficial de prompts/conclusão.
3. Leia o handoff da execução anterior, se fornecido.
4. Inspecione o estado REAL do repositório, branch, PRs, migrations e CI antes de editar.

NÃO REABRIR
- Athlete App e Command Center são produtos separados.
- Athlete App usa AthleteShell.
- Preview administrativo é read-only; sem impersonation.
- RLS continua obrigatório.
- Ranking Points e UR Coins são ledgers separados.
- Histórico homologado integra a carreira.
- Datas desconhecidas não são inventadas.
- Hunter é área opt-in de desenvolvimento, não XP geral.
- Equipes são eixo central do produto.
- Duplas e quartetos são formações nativas.
- Formações são temporais/por temporada.
- Nenhuma transferência implícita; convite + aceite.
- Não criar engine paralela, score, badge, recomendação ou progressão fictícia.
- Mobile-first. Desktop é adaptação.
- Não transformar novamente o App em portal de cards/janelas.

MODO DE TRABALHO
- Preserve tudo que já estiver correto.
- Faça mudanças pequenas, rastreáveis e reversíveis.
- Prefira contratos/backend canônicos a hardcode de frontend.
- Não faça direct-write corretivo em Production.
- Se um requisito depender de uma regra inexistente, pare nesse ponto, implemente apenas a estrutura segura e registre a decisão pendente.
- Classifique problemas P0/P1/P2 e corrija somente P0/P1 no fechamento do prompt.
- Não declare teste verde sem evidência do run.

SAÍDA OBRIGATÓRIA
Ao final informe:
1. o que foi feito;
2. o que foi preservado;
3. arquivos/migrations principais;
4. testes executados e resultados;
5. UAT mobile/desktop quando aplicável;
6. P0/P1/P2;
7. SHA candidato;
8. Production tocada ou não;
9. próximo prompt recomendado.


PROMPT 14 — RECONCILIAÇÃO DE DADOS REAIS + ATIVAÇÃO

OBJETIVO
Preparar a base real para uso pelos atletas.

REGRAS APROVADAS
- Atletas da Planilha Mestre são considerados ativos no ecossistema.
- Confirmação esportiva ocorre após primeira participação em UR Play.
- Quem já participou do histórico homologado é confirmado.
- Jogos históricos já cadastrados contam para a carreira conforme regras oficiais.
- Datas reais devem ser preenchidas apenas com evidência; 18/07 e 28/07 podem ser usadas onde a fonte comprovar.
- Não gerar estados operacionais retroativos fictícios.

AUDITE E RECONCILIE
Planilha Mestre × athletes × profiles/Auth × histórico × ranking × equipes × formações × polos.

RESOLVA
- duplicidades;
- aliases;
- identidade;
- athlete/profile link;
- status;
- equipe/formação somente com evidência;
- primeiro acesso seguro.

AUTH
Não usar senha previsível baseada em CPF.
Preferir convite/reset seguro.

PRÓXIMOS EVENTOS
Cadastrar próximas sessões reais por fluxo administrativo/RPC apropriado, não direct-write ad hoc.

PRODUCTION
Este prompt pode PREPARAR migrations/scripts e dry-run. Não aplique alterações em Production sem checkpoint explícito e plano de rollback aprovado.

GATES
Relatório before/after.
Idempotência.
Quality + Isolated QA.
Dry-run.
GO/NO-GO para aplicação de dados.
```

## P15 — Piloto E2E Production controlado

#### PROMPT COPIÁVEL

```text
PROMPT UNIVERSAL DE CONTINUIDADE — ULTIMATE RIVALS ATHLETE APP

Você está continuando o desenvolvimento do Athlete App do Ultimate Rivals.

REPOSITÓRIO
ultimaterivals/ultimate-rivals-app

FONTE DE VERDADE
1. Leia integralmente o Documento Mestre vigente do Athlete App.
2. Leia o documento oficial de prompts/conclusão.
3. Leia o handoff da execução anterior, se fornecido.
4. Inspecione o estado REAL do repositório, branch, PRs, migrations e CI antes de editar.

NÃO REABRIR
- Athlete App e Command Center são produtos separados.
- Athlete App usa AthleteShell.
- Preview administrativo é read-only; sem impersonation.
- RLS continua obrigatório.
- Ranking Points e UR Coins são ledgers separados.
- Histórico homologado integra a carreira.
- Datas desconhecidas não são inventadas.
- Hunter é área opt-in de desenvolvimento, não XP geral.
- Equipes são eixo central do produto.
- Duplas e quartetos são formações nativas.
- Formações são temporais/por temporada.
- Nenhuma transferência implícita; convite + aceite.
- Não criar engine paralela, score, badge, recomendação ou progressão fictícia.
- Mobile-first. Desktop é adaptação.
- Não transformar novamente o App em portal de cards/janelas.

MODO DE TRABALHO
- Preserve tudo que já estiver correto.
- Faça mudanças pequenas, rastreáveis e reversíveis.
- Prefira contratos/backend canônicos a hardcode de frontend.
- Não faça direct-write corretivo em Production.
- Se um requisito depender de uma regra inexistente, pare nesse ponto, implemente apenas a estrutura segura e registre a decisão pendente.
- Classifique problemas P0/P1/P2 e corrija somente P0/P1 no fechamento do prompt.
- Não declare teste verde sem evidência do run.

SAÍDA OBRIGATÓRIA
Ao final informe:
1. o que foi feito;
2. o que foi preservado;
3. arquivos/migrations principais;
4. testes executados e resultados;
5. UAT mobile/desktop quando aplicável;
6. P0/P1/P2;
7. SHA candidato;
8. Production tocada ou não;
9. próximo prompt recomendado.


PROMPT 15 — PILOTO E2E PRODUCTION CONTROLADO

OBJETIVO
Executar o primeiro UR Play totalmente nativo do novo sistema dando continuidade ao histórico existente.

PRÉ-CONDIÇÕES
- Prompt 14 GO.
- atletas reais ativados;
- sessão real criada;
- staff definido;
- rollback e monitoramento prontos.

PERCORRA
publicação → inscrição/interesse → reserva/waitlist → check-in → preflight → Court Ops → confrontos → resultado → homologação → ranking ledger → ranking projection → UR Coins quando aplicável → histórico → equipe/contribuição → pós-sessão.

INVARIANTES
- sem duplicação;
- sem direct-write corretivo;
- resultado reversível por mecanismo oficial;
- Ranking Points ≠ URC;
- atribuição de equipe temporal;
- histórico anterior preservado.

DADOS REAIS
Use somente o evento real escolhido para o piloto. Não simule atletas em Production.

SAÍDA
Relatório de operação, timestamps, erros, P0/P1/P2, invariantes antes/depois e decisão de continuar rollout.

GATES
Smoke pós-piloto.
Ledger reconciliation.
Ranking reconciliation.
Logs.
GO/NO-GO.
```

## P16 — UAT final

#### PROMPT COPIÁVEL

```text
PROMPT UNIVERSAL DE CONTINUIDADE — ULTIMATE RIVALS ATHLETE APP

Você está continuando o desenvolvimento do Athlete App do Ultimate Rivals.

REPOSITÓRIO
ultimaterivals/ultimate-rivals-app

FONTE DE VERDADE
1. Leia integralmente o Documento Mestre vigente do Athlete App.
2. Leia o documento oficial de prompts/conclusão.
3. Leia o handoff da execução anterior, se fornecido.
4. Inspecione o estado REAL do repositório, branch, PRs, migrations e CI antes de editar.

NÃO REABRIR
- Athlete App e Command Center são produtos separados.
- Athlete App usa AthleteShell.
- Preview administrativo é read-only; sem impersonation.
- RLS continua obrigatório.
- Ranking Points e UR Coins são ledgers separados.
- Histórico homologado integra a carreira.
- Datas desconhecidas não são inventadas.
- Hunter é área opt-in de desenvolvimento, não XP geral.
- Equipes são eixo central do produto.
- Duplas e quartetos são formações nativas.
- Formações são temporais/por temporada.
- Nenhuma transferência implícita; convite + aceite.
- Não criar engine paralela, score, badge, recomendação ou progressão fictícia.
- Mobile-first. Desktop é adaptação.
- Não transformar novamente o App em portal de cards/janelas.

MODO DE TRABALHO
- Preserve tudo que já estiver correto.
- Faça mudanças pequenas, rastreáveis e reversíveis.
- Prefira contratos/backend canônicos a hardcode de frontend.
- Não faça direct-write corretivo em Production.
- Se um requisito depender de uma regra inexistente, pare nesse ponto, implemente apenas a estrutura segura e registre a decisão pendente.
- Classifique problemas P0/P1/P2 e corrija somente P0/P1 no fechamento do prompt.
- Não declare teste verde sem evidência do run.

SAÍDA OBRIGATÓRIA
Ao final informe:
1. o que foi feito;
2. o que foi preservado;
3. arquivos/migrations principais;
4. testes executados e resultados;
5. UAT mobile/desktop quando aplicável;
6. P0/P1/P2;
7. SHA candidato;
8. Production tocada ou não;
9. próximo prompt recomendado.


PROMPT 16 — UAT FINAL DO ATHLETE APP

OBJETIVO
Executar UAT final sobre o candidato de lançamento.

PERCORRA
Início;
Jogar/Agenda;
Disponibilidade;
Arenas;
Resultados;
Histórico;
Ranking Individual;
Duplas;
Quartetos;
Equipes;
Polos;
Temporada;
Evolução;
Hunter;
Minha Equipe;
Recrutamento;
Oportunidades;
Premiações/repasses;
Wallet;
Market;
Destaques;
Perfil;
Feedback;
Notificações;
Onboarding;
Preview.

PERSONAS
1. atleta com histórico;
2. atleta confirmado sem equipe;
3. atleta de equipe;
4. admin-atleta;
5. Preview read-only.

VIEWPORTS
Mobile iPhone como principal.
Mobile Android compacto.
Desktop.

CLASSIFICAÇÃO
P0/P1/P2.
Corrija somente P0/P1.
Não fazer redesign por P2.

REEXECUTE
Quality.
Isolated QA.
E2E relevante.

CONGELE
SHA candidato.
Não deployar ainda.
```

## P17 — Auditoria Production + Deploy

#### PROMPT COPIÁVEL

```text
PROMPT UNIVERSAL DE CONTINUIDADE — ULTIMATE RIVALS ATHLETE APP

Você está continuando o desenvolvimento do Athlete App do Ultimate Rivals.

REPOSITÓRIO
ultimaterivals/ultimate-rivals-app

FONTE DE VERDADE
1. Leia integralmente o Documento Mestre vigente do Athlete App.
2. Leia o documento oficial de prompts/conclusão.
3. Leia o handoff da execução anterior, se fornecido.
4. Inspecione o estado REAL do repositório, branch, PRs, migrations e CI antes de editar.

NÃO REABRIR
- Athlete App e Command Center são produtos separados.
- Athlete App usa AthleteShell.
- Preview administrativo é read-only; sem impersonation.
- RLS continua obrigatório.
- Ranking Points e UR Coins são ledgers separados.
- Histórico homologado integra a carreira.
- Datas desconhecidas não são inventadas.
- Hunter é área opt-in de desenvolvimento, não XP geral.
- Equipes são eixo central do produto.
- Duplas e quartetos são formações nativas.
- Formações são temporais/por temporada.
- Nenhuma transferência implícita; convite + aceite.
- Não criar engine paralela, score, badge, recomendação ou progressão fictícia.
- Mobile-first. Desktop é adaptação.
- Não transformar novamente o App em portal de cards/janelas.

MODO DE TRABALHO
- Preserve tudo que já estiver correto.
- Faça mudanças pequenas, rastreáveis e reversíveis.
- Prefira contratos/backend canônicos a hardcode de frontend.
- Não faça direct-write corretivo em Production.
- Se um requisito depender de uma regra inexistente, pare nesse ponto, implemente apenas a estrutura segura e registre a decisão pendente.
- Classifique problemas P0/P1/P2 e corrija somente P0/P1 no fechamento do prompt.
- Não declare teste verde sem evidência do run.

SAÍDA OBRIGATÓRIA
Ao final informe:
1. o que foi feito;
2. o que foi preservado;
3. arquivos/migrations principais;
4. testes executados e resultados;
5. UAT mobile/desktop quando aplicável;
6. P0/P1/P2;
7. SHA candidato;
8. Production tocada ou não;
9. próximo prompt recomendado.


PROMPT 17 — AUDITORIA PRODUCTION + DEPLOY CONTROLADO

OBJETIVO
Auditar Production contra o SHA congelado e emitir GO/NO-GO.

VERIFIQUE
- migrations;
- RLS/policies;
- Auth;
- ranking ledgers/projections;
- doubles/quartets/team contribution;
- historical imports;
- season;
- Hunter contracts;
- team/recruitment contracts;
- Wallet/URC;
- Market;
- opportunities/prizes/repasses;
- feedback;
- media privacy;
- secrets/env;
- logs;
- backup/PITR;
- rollback;
- smoke.

REGRAS
- Nenhum direct-write corretivo.
- Drift de schema é corrigido somente por migration.
- Drift de regra/dado por RPC/serviço/script idempotente aprovado.
- Não expor secrets em relatório.

SE NO-GO
Pare, liste bloqueadores e correção forward-only.

SE GO
1. registre SHA;
2. faça deploy controlado;
3. aplique migrations aprovadas;
4. execute smoke;
5. confirme invariantes;
6. registre deployment e rollback target.

SAÍDA
GO/NO-GO formal.
```

## P18 — Launch Gate e congelamento V1

#### PROMPT COPIÁVEL

```text
PROMPT UNIVERSAL DE CONTINUIDADE — ULTIMATE RIVALS ATHLETE APP

Você está continuando o desenvolvimento do Athlete App do Ultimate Rivals.

REPOSITÓRIO
ultimaterivals/ultimate-rivals-app

FONTE DE VERDADE
1. Leia integralmente o Documento Mestre vigente do Athlete App.
2. Leia o documento oficial de prompts/conclusão.
3. Leia o handoff da execução anterior, se fornecido.
4. Inspecione o estado REAL do repositório, branch, PRs, migrations e CI antes de editar.

NÃO REABRIR
- Athlete App e Command Center são produtos separados.
- Athlete App usa AthleteShell.
- Preview administrativo é read-only; sem impersonation.
- RLS continua obrigatório.
- Ranking Points e UR Coins são ledgers separados.
- Histórico homologado integra a carreira.
- Datas desconhecidas não são inventadas.
- Hunter é área opt-in de desenvolvimento, não XP geral.
- Equipes são eixo central do produto.
- Duplas e quartetos são formações nativas.
- Formações são temporais/por temporada.
- Nenhuma transferência implícita; convite + aceite.
- Não criar engine paralela, score, badge, recomendação ou progressão fictícia.
- Mobile-first. Desktop é adaptação.
- Não transformar novamente o App em portal de cards/janelas.

MODO DE TRABALHO
- Preserve tudo que já estiver correto.
- Faça mudanças pequenas, rastreáveis e reversíveis.
- Prefira contratos/backend canônicos a hardcode de frontend.
- Não faça direct-write corretivo em Production.
- Se um requisito depender de uma regra inexistente, pare nesse ponto, implemente apenas a estrutura segura e registre a decisão pendente.
- Classifique problemas P0/P1/P2 e corrija somente P0/P1 no fechamento do prompt.
- Não declare teste verde sem evidência do run.

SAÍDA OBRIGATÓRIA
Ao final informe:
1. o que foi feito;
2. o que foi preservado;
3. arquivos/migrations principais;
4. testes executados e resultados;
5. UAT mobile/desktop quando aplicável;
6. P0/P1/P2;
7. SHA candidato;
8. Production tocada ou não;
9. próximo prompt recomendado.


PROMPT 18 — LAUNCH GATE E CONGELAMENTO OFICIAL V1

OBJETIVO
Declarar o Athlete App pronto para uso controlado e criar o baseline oficial da V1.

CONFIRME
- Production deploy = SHA aprovado;
- migrations alinhadas;
- P0 = 0;
- P1 = 0;
- Quality green;
- Isolated QA green;
- UAT green;
- login/reset/first access green;
- histórico/ranking green;
- primeira sessão nativa green;
- equipes/duplas/quartetos sem inconsistência;
- Hunter seguro;
- Wallet/Market seguros;
- rollback testado/documentado;
- monitoramento/logs acessíveis.

DOCUMENTE
- SHA V1 oficial;
- data/hora;
- deployment;
- migrations;
- estado de dados;
- backlog P2;
- limitações conhecidas;
- manual de operação;
- manual do atleta;
- plano de rollout.

ROLLOUT
Preferir abertura controlada em ondas:
equipe interna → pequeno grupo de atletas → atletas confirmados → base ativa.

REGRA FINAL
Após o freeze, qualquer mudança entra por PR e passa pelos gates definidos. Não continue 'melhorando' Production fora de release.
```

## 20. HANDOFF PADRÃO ENTRE CONVERSAS

#### MODELO COPIÁVEL DE HANDOFF

```text
HANDOFF — ULTIMATE RIVALS ATHLETE APP

PROMPT CONCLUÍDO:
[PX — nome]

REPOSITÓRIO:
ultimaterivals/ultimate-rivals-app

BRANCH:
[...]

SHA CANDIDATO:
[...]

BASE MAIN:
[...]

O QUE FOI IMPLEMENTADO:
- ...

ARQUIVOS/MIGRATIONS PRINCIPAIS:
- ...

CONTRATOS/REGRAS PRESERVADOS:
- ...

QUALITY:
run ... = success/failure/in progress

ISOLATED QA:
run ... = success/failure/not required

UAT:
mobile = ...
desktop = ...
preview = ...

P0:
...

P1:
...

P2:
...

PRODUCTION:
não tocada / alterada somente por ...

PENDÊNCIAS REAIS:
- ...

PRÓXIMO PROMPT:
[PX+1]

IMPORTANTE PARA A PRÓXIMA CONVERSA:
- Leia Documento Mestre V3.
- Leia o documento oficial de prompts.
- Não reabra decisões aprovadas.
- Verifique estado REAL do repo antes de continuar.
```

## 21. CHECKLIST DE CONTINUIDADE

- Documento Mestre vigente anexado/disponível.

- Documento de Prompts vigente anexado/disponível.

- Handoff anterior fornecido.

- Repo e branch confirmados.

- Prompt atual identificado.

- Escopo anterior encerrado.

- P0/P1 anteriores zerados ou explicitamente bloqueantes.

- Production state conhecido antes de qualquer write.

## 22. REGRAS PARA CODEX NÃO DEGRADAR O PRODUTO

1. Não substituir experiência mobile por layout desktop responsivo genérico.

1. Não reintroduzir menu com quinze destinos na navegação principal.

1. Não trocar a logo oficial por monograma/redesenho.

1. Não representar dados ausentes com exemplos em telas reais.

1. Não misturar Hunter e Evolução comum.

1. Não reduzir Equipe a card de roster; preservar profissionalização, recrutamento, quartetos e oportunidades.

1. Não ocultar premiações/repasses relevantes dentro de regulamento.

1. Não criar escassez falsa de equipes.

1. Não criar score de profissionalização sem critérios oficiais.

1. Não inventar recomendação automática.

1. Não corrigir ranking, coins, resultado ou repasse por update manual.

1. Não fazer deploy para encerrar um prompt de UX antes de UAT/gates.

## 23. DEFINIÇÃO DE CONCLUSÃO DO PROGRAMA DE PROMPTS

> CONCLUÍDO
> A sequência termina somente quando o Prompt 18 estiver aprovado: SHA V1 oficial em Production, P0/P1 zerados, UAT/Quality/Isolated QA verdes, atletas reais capazes de usar o ciclo completo, equipes e quartetos operacionais, Hunter seguro, economia auditável, primeiro UR Play nativo concluído e rollback documentado.
