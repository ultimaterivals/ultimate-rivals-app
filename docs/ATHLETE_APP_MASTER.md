# Ultimate Rivals — Athlete App

## Documento Mestre de produto, UX, operação e desenvolvimento

> Fonte oficial: `1-UR_ATHLETE_APP_DOCUMENTO_MESTRE_V3_2026-08-28.docx`
> SHA-256 da fonte: `39983AAF61F0D87FE1D916289CCD7B61305766FCB5C25C3A77113364F3D3B0E1`
> Transcrição integral versionada para continuidade do produto. Em caso de alteração estrutural, registrar ADR ou nova versão da fonte.

Versão 3.0 · Base estrutural preservada até a conclusão do aplicativo · 28/08/2026

> PROPÓSITO DESTE DOCUMENTO
> Ser a fonte única de verdade para o Athlete App: produto, experiência, arquitetura funcional, estados, equipes, quartetos, temporada, Hunter, oportunidades, economia, conteúdo, dados, operação, QA e critérios de conclusão. Toda evolução futura deve preservar esta base ou registrar formalmente a mudança.

> Conceito de experiência: Rumo ao Estrelato.

> Promessa do produto: transformar participação esportiva em carreira contínua, visível e progressiva dentro do ecossistema Ultimate Rivals.

## 0. CONTROLE DO DOCUMENTO E GOVERNANÇA

### 0.1 Status

| Item             | Definição                                                             |
| ---------------- | --------------------------------------------------------------------- |
| Documento        | UR Athlete App — Documento Mestre V3                                  |
| Status           | BASE ESTRUTURAL APROVADA PARA PRESERVAÇÃO                             |
| Produto          | Athlete App Ultimate Rivals                                           |
| Prioridade       | Mobile-first; desktop como adaptação                                  |
| Arquitetura      | Athlete App separado do Command Center; backend compartilhado         |
| Mudanças futuras | Somente por revisão explícita, ADR ou nova versão do Documento Mestre |

### 0.2 Regra de preservação

Nenhuma conversa futura deve reconstruir a arquitetura do aplicativo do zero. A continuidade deve partir deste documento. Alterações relevantes precisam registrar: ID da decisão, data, problema, decisão, impacto, migração necessária, risco, status e versão afetada.

### 0.3 Registro de decisões já congeladas

| ADR         | Decisão                                                                              | Status   |
| ----------- | ------------------------------------------------------------------------------------ | -------- |
| ADR-ATH-001 | Mobile-first; cinco destinos principais na navegação inferior.                       | Aprovado |
| ADR-ATH-002 | AthleteShell permanece; não substituir por PortalShell.                              | Aprovado |
| ADR-ATH-003 | Command Center e Athlete App permanecem produtos separados.                          | Aprovado |
| ADR-ATH-004 | Preview administrativo é read-only; sem impersonation.                               | Aprovado |
| ADR-ATH-005 | Ranking Points e UR Coins são ledgers separados.                                     | Aprovado |
| ADR-ATH-006 | Hunter é área própria e voluntária de desenvolvimento; não é XP geral.               | Aprovado |
| ADR-ATH-007 | Equipe é eixo central do produto e terá trilha de profissionalização.                | Aprovado |
| ADR-ATH-008 | Duplas e quartetos são unidades competitivas nativas da equipe.                      | Aprovado |
| ADR-ATH-009 | Formações são vinculadas à temporada; não pertencem eternamente à equipe.            | Aprovado |
| ADR-ATH-010 | Vagas de equipes oficiais podem ser limitadas por capacidade real do polo/categoria. | Aprovado |
| ADR-ATH-011 | Entrada em equipe exige convite/aceite; oficialização depende do UR.                 | Aprovado |
| ADR-ATH-012 | Dados inexistentes não podem ser preenchidos com gamificação fictícia.               | Aprovado |

## 1. VISÃO DO PRODUTO

O Athlete App não deve funcionar como portal administrativo nem como coleção de módulos. Ele deve apresentar ao atleta uma carreira esportiva em movimento e mostrar que o Ultimate Rivals é uma estrutura completa de competição, desenvolvimento, equipes, mídia, economia e oportunidades.

> NARRATIVA CENTRAL
> Entrar → Jogar → Competir → Gerar resultado → Ganhar pontos → Subir no ranking → Evoluir → Fortalecer equipe → Ganhar reconhecimento → Conquistar benefícios e UR Coins → Classificar-se → Avançar na temporada → Desenvolver-se no Hunter → Jogar novamente.

### 1.1 Sensação desejada

- Carreira, não cadastro.

- Competição viva, não tabela.

- Progressão, não coleção de páginas.

- Identidade esportiva, não perfil burocrático.

- Equipe como organização esportiva em construção.

- Hunter como escola de desenvolvimento para quem quer ir além.

- Oportunidades concretas além de premiações.

- Reconhecimento e mídia como parte da experiência.

- Recompensas conectadas a ações reais.

- Escassez e status somente quando sustentados por regras reais.

### 1.2 As cinco perguntas que toda funcionalidade deve responder

| Pergunta do atleta                            | Superfícies principais                                       |
| --------------------------------------------- | ------------------------------------------------------------ |
| Onde estou?                                   | Início, Temporada, Ranking, Equipe, Perfil                   |
| Onde posso jogar?                             | Jogar, Agenda, Arenas, Disponibilidade                       |
| Como estou performando?                       | Resultados, Histórico, Ranking, Evolução                     |
| Como posso evoluir?                           | Evolução, Hunter, Equipe                                     |
| O que conquistei e quais oportunidades tenho? | Destaques, Oportunidades, Wallet, Market, Premiações, Equipe |

## 2. PRINCÍPIOS NÃO NEGOCIÁVEIS

1. Mobile é o produto principal. Desktop preserva funcionalidades, mas não dita a experiência.

2. O Athlete App usa AthleteShell.

3. Command Center e Athlete App compartilham backend, entidades, contratos, RPCs e ledgers, não a mesma experiência.

4. Preview administrativo é somente leitura.

5. Nenhuma superfície de atleta pode bypassar RLS.

6. Ranking Points e UR Coins permanecem separados.

7. Nenhuma engine paralela de XP, badge ou missão pode ser inventada fora dos contratos oficiais.

8. Histórico oficial já realizado integra a carreira do atleta.

9. Datas históricas só aparecem quando comprovadas; desconhecido permanece desconhecido.

10. Resultados, pontos, Coins, elegibilidade e repasses devem ser rastreáveis.

11. Hunter é opt-in e separado da participação normal no UR Play.

12. Equipe é protagonista estratégico, não simples associação cadastral.

13. Escassez de vagas de equipes oficiais deve refletir capacidade operacional real.

14. Atletas devem aceitar convites de equipe; nenhuma transferência implícita.

15. A interface deve priorizar hierarquia, mídia, movimento e contexto em vez de caixas repetitivas.

16. Estados de interesse, reserva, lista de espera, check-in e participação nunca podem ser confundidos.

## 3. ARQUITETURA DE INFORMAÇÃO

### 3.1 Navegação mobile permanente

| Destino | Função                           | Conteúdo absorvido                                                                              |
| ------- | -------------------------------- | ----------------------------------------------------------------------------------------------- |
| Início  | Player Hub / carreira            | Campanha, próximo movimento, ranking, resultados, equipe, oportunidades, recompensas, destaques |
| Jogar   | Entrada em quadra                | Agenda, oportunidades, disponibilidade, arenas, reserva, waitlist, check-in                     |
| Ranking | Competição viva                  | Individual, duplas, quartetos, equipes, polos, filtros, critérios                               |
| Hunter  | Escola de desenvolvimento        | Metodologia, adesão, trilhas, conteúdos, atividades, plano, avaliações e acompanhamento         |
| Perfil  | Identidade e ecossistema pessoal | Player Card, equipe, histórico, Wallet, Market, destaques, feedback, conta                      |

### 3.2 Navegação desktop

Desktop pode oferecer navegação lateral mais ampla, organizada em Carreira e Ecossistema, mas sem repetir a antiga lógica de portal com todos os módulos em igual prioridade.

### 3.3 Rotas funcionais previstas

| Rota conceitual          | Responsabilidade         |
| ------------------------ | ------------------------ |
| /athlete                 | Início / Player Hub      |
| /athlete/agenda          | Jogar / Agenda           |
| /athlete/disponibilidade | Disponibilidade          |
| /athlete/arenas          | Arenas                   |
| /athlete/ranking         | Ranking                  |
| /athlete/results         | Resultados atuais        |
| /athlete/history         | Histórico oficial        |
| /athlete/season          | Temporada                |
| /athlete/development     | Evolução esportiva       |
| /athlete/hunter          | Hunter                   |
| /athlete/team            | Minha Equipe             |
| /athlete/teams           | Ecossistema de Equipes   |
| /athlete/opportunities   | Central de Oportunidades |
| /athlete/highlights      | Destaques                |
| /athlete/wallet          | Wallet URC               |
| /athlete/market          | UR Market                |
| /athlete/perfil          | Perfil / Player Card     |
| /athlete/feedback        | Feedback e suporte       |
| /athlete/notifications   | Notificações             |
| /athlete/onboarding      | Primeiro acesso          |

## 4. INÍCIO — PLAYER HUB / RUMO AO ESTRELATO

A Home é a superfície mais importante. Ela deve responder em segundos: quem sou, onde estou, o que fiz, o que está em disputa, qual é meu próximo passo e quais oportunidades estão abertas.

### 4.1 Hero do atleta

- Foto/avatar aprovado

- Nome público e UR ID

- Polo

- Categoria e nível

- Equipe quando houver

- Ranking e pontos

- Status da temporada

- Indicador de movimento competitivo

### 4.2 Campanha atual

- Temporada ativa

- Fase atual

- Mapa Abertura → UR Play/Ranking → Series → Cup → Legends → Virada

- Marcador 'Você está aqui'

- Critérios de avanço quando publicados

### 4.3 Próximo movimento

- Próxima reserva confirmada

- Oportunidades elegíveis

- Pendência real de disponibilidade

- Resultado aguardando homologação

- Objetivo competitivo baseado em dados

- CTA único e dominante

### 4.4 Meu momento

- Jogos

- Vitórias

- Derrotas

- Aproveitamento

- Pontos

- Posição

- Aces/ataques e demais estatísticas disponíveis

- Sequência recente quando calculada canonicamente

### 4.5 Ranking em movimento

- Atleta imediatamente acima

- Atleta atual

- Atleta imediatamente abaixo

- Distância em pontos

- Movimento de posição

- CTA para ranking completo

### 4.6 Equipe em movimento

- Escudo/nome

- Posição da equipe

- Contribuição do atleta

- Formações ativas

- Próximo objetivo coletivo

- Zona de repasse/classificação quando oficial

### 4.7 Oportunidades

- Premiações

- Repasses

- Convites

- Hunter

- Market

- Mídia

- Vagas de equipe

- Parceiros

- Eventos e experiências

### 4.8 Destaques

- Clipes e fotos publicados

- MVP

- Hunter

- Jogada da rodada

- Pódios

- Atletas/equipes em evidência

## 5. JOGAR — CICLO DE ENTRADA EM QUADRA

### 5.1 Hierarquia

- Próxima atividade confirmada.

- Oportunidades abertas.

- Agenda completa.

- Disponibilidade.

- Arenas.

- Histórico de inscrições/reservas.

### 5.2 Estados obrigatoriamente distintos

| Estado          | Significado                                   | Crédito                                           |
| --------------- | --------------------------------------------- | ------------------------------------------------- |
| Interesse       | Sinaliza intenção; não confirma vaga.         | Não reserva                                       |
| Reserva         | Confirma vaga conforme regra da oportunidade. | Pode colocar crédito em reserva conforme contrato |
| Lista de espera | Aguarda vaga.                                 | Não reserva enquanto estiver apenas em waitlist   |
| Check-in        | Registra chegada/presença operacional.        | Não é resultado final                             |
| Participação    | Estado concluído após atividade/homologação.  | Segue regra econômica vigente                     |

### 5.3 Disponibilidade

Disponibilidade é informação de planejamento. Não é reserva, não consome crédito e não cria recomendação automática implícita.

### 5.4 Arenas

- Arena

- Polo

- Endereço

- Estrutura

- Fotos aprovadas

- Próximas oportunidades

- Rota/direções

- Regras locais relevantes

## 6. RANKING — COMPETIÇÃO VIVA

### 6.1 Tipos de ranking

- Individual

- Duplas

- Quartetos

- Equipes

- Polos

### 6.2 Experiência mobile

- Sua posição primeiro.

- Movimento de posição.

- Distância para rival acima e zona-alvo.

- Top 3 destacado.

- Rivais próximos.

- Classificação completa abaixo.

- Filtros por categoria, nível, formato, polo e período.

### 6.3 Explicabilidade

- Pontuação

- Desempates

- Ciclos e resets

- Elegibilidade

- Origem dos pontos

- Atualização/homologação

> REGRA
> A projeção de ranking é derivada do ledger. Nunca corrigir posição/pontos diretamente no read model.

## 7. RESULTADOS E HISTÓRICO

### 7.1 Resultados atuais

Eventos do fluxo operacional atual, com placar, formação, adversários, status de homologação, estatísticas técnicas elegíveis e impacto competitivo quando aplicável.

### 7.2 Histórico oficial

Importações históricas homologadas fazem parte da carreira do atleta e contam para jogos, vitórias, derrotas, aproveitamento, estatísticas e Ranking Points conforme regra oficial. Estados operacionais inexistentes no passado não devem ser fabricados.

### 7.3 Privacidade

- Sem IDs internos

- Sem notas de operador

- Sem evidence/provenance interna

- Sem recomendações administrativas

- Somente dados esportivos publicáveis

## 8. TEMPORADA — CAMPANHA

### 8.1 Mapa estrutural

Abertura → UR Play + Ranking → UR Series → UR Cup → UR Legends → Virada de Ranking.

### 8.2 Cada etapa deve mostrar

- O que é

- Quem participa

- Critérios

- Sua situação

- O que falta

- Premiações/benefícios

- Datas somente quando oficiais

- Regulamento

### 8.3 Premiações conhecidas da Temporada 1

| Etapa                          | Premiação                                               |
| ------------------------------ | ------------------------------------------------------- |
| UR Series                      | Campeão R$ 800 · Vice R$ 400 · 3º R$ 300 · MVP R$ 500   |
| UR Cup                         | Campeão R$ 1.200 · Vice R$ 800 · 3º R$ 500 · MVP R$ 700 |
| UR Legends                     | Campeão R$ 800 · Vice R$ 400 · 3º R$ 300 · MVP R$ 500   |
| Virada de Ranking — Equipes N3 | 1º R$ 1.500 · 2º R$ 1.000 · 3º R$ 800                   |
| Melhor atleta do ranking       | R$ 1.000                                                |

> PRINCÍPIO DE UX
> Premiações e repasses não devem ficar escondidos em regulamento. Quando homologados e aplicáveis, devem aparecer como objetivo esportivo e oportunidade real.

## 9. EVOLUÇÃO ESPORTIVA

Evolução é a leitura normal da carreira esportiva. Não é Hunter.

- Nível atual e status de nivelamento.

- Jogos, vitórias, aproveitamento e estatísticas.

- Histórico de evolução quando houver séries temporais confiáveis.

- Prioridades publicadas pela operação.

- Próxima revisão quando existir.

- Marcos verificáveis.

- Próximo passo esportivo.

> REGRA
> Sem nota, radar, percentual ou diagnóstico inventado para preencher espaço visual.

## 10. HUNTER — ESCOLA DE DESENVOLVIMENTO UR

Hunter é uma área especial e voluntária para atletas que desejam se desenvolver de verdade. O atleta pode competir normalmente no Ultimate Rivals sem participar do Hunter.

### 10.1 Jornada Hunter

Conhecer → Demonstrar interesse → Aprovação/entrada → Diagnóstico ou plano homologado → Aprender → Aplicar → Revisar → Evoluir → Novo ciclo.

### 10.2 Trilhas iniciais

| Trilha                   | Escopo                                                                         |
| ------------------------ | ------------------------------------------------------------------------------ |
| Mentalidade e preparação | Foco, disciplina, resiliência, preparação mental e hábitos competitivos.       |
| Inteligência de jogo     | Leitura de jogo, tomada de decisão, análise de cenários e consistência.        |
| Liderança e equipe       | Comunicação, responsabilidade, comportamento, trabalho em equipe e influência. |
| Evolução contínua        | Ciclos de aprendizagem, aplicação no UR Play, revisão e próximos objetivos.    |

### 10.3 Pilares

- Disciplina

- Leitura de jogo

- Tomada de decisão

- Consistência

- Competitividade

- Evolução contínua

- Liderança

- Trabalho em equipe

- Comportamento

- Preparação mental

### 10.4 Área de não participantes

- Apresentação

- Metodologia

- Como funciona

- Trilhas

- Benefícios

- Depoimentos futuros

- CTA Quero fazer parte

### 10.5 Área de participantes

- Meu plano

- Ciclo atual

- Objetivo

- Prioridades

- Conteúdos

- Atividades

- Missões práticas

- Avaliações homologadas

- Feedback de mentor/comissão

- Encontros

- Histórico de ciclos

- Próxima revisão

### 10.6 Regra de entrada

Atleta confirmado pode solicitar entrada. A equipe UR aprova e publica o plano. O modelo poderá evoluir para programas pagos/assinaturas sem alterar a natureza opt-in.

## 11. EQUIPES — EIXO ESTRATÉGICO DO ECOSSISTEMA

> VISÃO
> Uma equipe oficial UR não é apenas um nome no ranking. É uma organização esportiva em desenvolvimento dentro de um ecossistema que oferece competição, formação, mídia, oportunidades, parceiros, benefícios e possibilidade de repasse financeiro.

### 11.1 Objetivos do sistema de equipes

- Criar identidade e pertencimento.

- Transformar equipes em organizações mais profissionais.

- Incentivar captação e formação de novos atletas.

- Gerar competição por vagas de equipes oficiais.

- Criar continuidade entre UR Play, Ranking, Cup, repasses e oportunidades.

- Valorizar equipes que desenvolvem atletas e fortalecem o ecossistema.

- Permitir crescimento por categorias, duplas e quartetos.

### 11.2 Trilha de profissionalização

Formar → Organizar → Competir → Crescer → Profissionalizar → Tornar-se referência.

| Estágio conceitual | Objetivo                   | Exemplos de evidência                                    |
| ------------------ | -------------------------- | -------------------------------------------------------- |
| Candidata          | Entrar no ecossistema      | Responsável, identidade inicial, interesse, atletas-base |
| Reconhecida        | Organização mínima         | Roster válido, polo, categorias, formações               |
| Oficial            | Atender critérios UR       | Regularidade, conduta, participação, estrutura           |
| Competitiva        | Performance e consistência | Ranking, resultados, formações completas                 |
| Destaque           | Marca e contribuição       | Mídia, captação, atletas desenvolvidos, Fair Play        |
| Elite UR           | Referência do ecossistema  | Alta performance, estrutura, continuidade e impacto      |

Os nomes de estágio podem ser refinados posteriormente sem remover a trilha. Critérios devem ser objetivos e publicados; nenhum score arbitrário.

### 11.3 Estrutura da equipe

- Identidade: nome, escudo, polo, história, categorias.

- Roster: atletas titulares e reservas conforme regulamento.

- Formações: duplas e quartetos por categoria/formato.

- Recrutamento: vagas, necessidades, convites, candidaturas.

- Competição: ranking, resultados, classificação e temporada.

- Contribuição: pontos canônicos atribuídos ao período correto.

- Profissionalização: checklist/trilha organizacional.

- Oportunidades: mídia, parceiros, eventos, desenvolvimento e patrocínios.

- Financeiro: premiações e repasses homologados.

- Reconhecimento: títulos, pódios, Fair Play e destaques.

- Expansão: novos atletas, novas formações e categorias.

### 11.4 Vagas oficiais disputadas

Vagas de equipes oficiais podem ser limitadas por polo/categoria de acordo com capacidade operacional real. Equipes candidatas disputam entrada por critérios transparentes. A escassez não pode ser artificial.

### 11.5 Quem cria e quem oficializa

Atleta confirmado ou responsável aprovado pode iniciar candidatura. A oficialização é decisão do Ultimate Rivals baseada em critérios publicados.

### 11.6 Convite e aceite

Nenhum atleta entra ou muda de equipe implicitamente. Convite + aceite obrigatório. Transferências futuras devem seguir janela e regras explícitas.

### 11.7 Página pública da equipe

- Nome/escudo

- Polo

- História

- Roster publicável

- Duplas e quartetos

- Ranking

- Resultados

- Conquistas

- Destaques

- Vagas abertas quando permitido

### 11.8 Índice de estrutura — formato correto

Se criado, deve ser checklist objetivo, não nota arbitrária. Exemplo:

- Identidade oficial

- Responsável definido

- Roster mínimo

- Duplas completas

- Quarteto completo

- Participação mínima

- Regularidade

- Código de conduta

- Mídia/identidade

- Captação ativa

## 12. DUPLAS E QUARTETOS

Duplas e quartetos são formações competitivas nativas, não simples filtros.

### 12.1 Princípios

- Formação é válida dentro de contexto temporal/temporada.

- Pode representar equipe quando vínculo estiver comprovado no período.

- Não inferir equipe retroativamente sem evidência.

- Ranking e resultados devem diferenciar formação de equipe.

- Quartetos precisam de mesma qualidade de dados, elegibilidade e histórico das duplas.

### 12.2 Estados de formação

- Em montagem

- Completa

- Elegível

- Ativa

- Suspensa/inativa

- Encerrada para o ciclo

### 12.3 Tela de formações da equipe

- Duplas femininas

- Duplas masculinas

- Duplas mistas

- Quartetos femininos

- Quartetos masculinos

- Quartetos mistos

- Titulares/reservas quando aplicável

- Status e elegibilidade

## 13. RECRUTAMENTO E MERCADO INTERNO DE ATLETAS

Recrutamento deve incentivar crescimento de equipes e dar oportunidade a atletas livres, sem tornar o app um mercado predatório.

- Equipe publica necessidade: categoria, nível, formato, polo e quantidade.

- Atleta pode demonstrar interesse em vagas permitidas.

- Equipe pode enviar convite.

- Atleta aceita ou recusa.

- Mudança só efetiva após regra operacional/administrativa.

- Vagas de quarteto incompleto podem receber destaque.

- Atleta livre pode indicar interesse em equipe.

- Futuro Draft pode reutilizar a mesma arquitetura de candidaturas e aceite.

> EXEMPLO DE UX
> Equipe procura atleta N2 · Feminino · Betim · Quarteto em formação · 1 vaga.

## 14. CENTRAL DE OPORTUNIDADES UR

O aplicativo precisa mostrar que Ultimate Rivals oferece um mundo de oportunidades além de jogar uma partida.

### 14.1 Categorias

| Categoria       | Exemplos                                                        |
| --------------- | --------------------------------------------------------------- |
| Competição      | UR Play, Series, Cup, Legends, desafios e eventos especiais     |
| Financeiro      | Premiações, repasses, incentivos homologados                    |
| Desenvolvimento | Hunter, workshops, treinos, avaliações, conteúdos               |
| Mídia           | Destaques, entrevistas, clipes, campanhas, transmissões         |
| Parceiros       | Testes de produto, ativações, benefícios, experiências          |
| Equipe          | Vagas, candidatura a equipe oficial, expansão de categoria      |
| Recompensas     | UR Coins, Market, produtos, serviços, experiências              |
| Carreira        | Convites, seleções, liderança, projetos e oportunidades futuras |

### 14.2 Personalização

A Central deve priorizar oportunidades elegíveis e relevantes, mas não criar recomendação automática sem engine/critério oficial. Quando a personalização não existir, usar filtros e regras explícitas.

## 15. PREMIAÇÕES, REPASSES E BENEFÍCIOS

Premiações e repasses são instrumentos de desejo, reconhecimento e sustentabilidade. Devem ter alta visibilidade quando vigentes e homologados.

### 15.1 Para atletas

- Prêmios de competição

- MVP e reconhecimentos

- Melhor atleta do ranking

- UR Coins

- Produtos e serviços

- Treinos e Hunter

- Mídia e exposição

- Experiências

- Ações de parceiros

- Convites especiais

### 15.2 Para equipes

- Repasses de virada/ranking

- Premiações competitivas

- Prioridade em eventos

- Exposição de mídia

- Ativações com parceiros

- Possibilidade de patrocínio

- Desenvolvimento de liderança

- Acesso a experiências e treinamentos

- Benefícios por expansão e formação de atletas quando formalizados

### 15.3 UX financeira

- Mostrar valor oficial em contexto de objetivo.

- Distinguir prêmio garantido, prêmio potencial e repasse já homologado.

- Nunca exibir 'estimativa de repasse' como valor devido sem regra.

- Histórico financeiro da equipe deve ser auditável.

## 16. ECONOMIA DA EQUIPE E REPASSES

A área financeira da equipe deve mostrar somente valores homologados e regras vigentes.

- Repasse recebido

- Prêmio recebido

- Período/ciclo

- Origem

- Status

- Comprovante/referência publicável quando aplicável

> REGRA
> Ranking competitivo pode ser base principal de repasse. Outros incentivos futuros devem ser separados e transparentes.

## 17. PERFIL / PLAYER CARD

O Perfil deve ser identidade esportiva, não formulário.

- Foto aprovada.

- Nome público e UR ID.

- Polo.

- Categoria e nível.

- Equipe.

- Dupla/quarteto quando aplicável.

- Ranking.

- Estatísticas principais.

- Conquistas verificáveis.

- Destaques publicados.

- Bio esportiva opcional.

### 17.1 Perfil público

Outro atleta pode abrir perfil esportivo público contendo apenas dados competitivos/publicáveis. Nunca email, telefone, disponibilidade, pagamentos, feedback ou dados internos.

### 17.2 Foto

Upload pelo atleta com aprovação/moderação UR antes de uso em superfícies públicas.

## 18. CONQUISTAS E MARCOS

Conquistas podem existir, mas apenas como marcos esportivos verificáveis. Não construir XP genérico.

- Primeiro UR Play

- 10 jogos

- Primeira vitória

- Top 10

- Top 3

- Título

- MVP

- Fair Play

- Hunter Cycle concluído quando homologado

- Sequência de vitórias quando calculada

## 19. MÍDIA E DESTAQUES

Mídia deve dar alma ao aplicativo usando atletas reais e conteúdo publicado.

- Destaques da rodada.

- MVP.

- Hunter.

- Melhor evolução.

- Fair Play.

- Jogada da rodada.

- Clipes e fotos.

- Histórias de equipes.

- Pódios e títulos.

- Conteúdo de parceiros aprovado.

Equilíbrio recomendado: base gráfica premium com crescente uso de mídia real conforme o acervo.

## 20. WALLET UR COINS

- Saldo disponível

- Histórico de ganhos

- Histórico de gastos

- Origem do evento

- Data

- Referência

- Regras de como ganhar

- Regras de como usar

> REGRA
> UR Coins não são Ranking Points e não podem ser derivados ou compensados entre si.

## 21. UR MARKET

- Vitrine

- Categorias

- Detalhe do item

- Preço URC

- Estoque

- Limite por atleta

- Validade

- Resgate

- Código/fulfillment

- Meus resgates

- Histórico

O Market só deve destacar itens realmente disponíveis. Oferta vazia é melhor do que produto fictício.

## 22. NOTIFICAÇÕES

| Categoria  | Exemplos                                       |
| ---------- | ---------------------------------------------- |
| Jogar      | Nova oportunidade, reserva, waitlist, check-in |
| Competição | Resultado homologado, mudança de ranking       |
| Temporada  | Classificação, nova etapa, prazo               |
| Equipe     | Convite, aceite, vaga, formação, repasse       |
| Hunter     | Aprovação, conteúdo, atividade, revisão        |
| Economia   | UR Coins recebidos, resgate                    |
| Mídia      | Destaque publicado                             |
| Suporte    | Feedback atualizado                            |

## 23. ONBOARDING E PRIMEIRO ACESSO

O onboarding deve reconhecer atletas já históricos e evitar tratá-los como iniciantes sem trajetória.

1. Boas-vindas.

2. Confirmar identidade.

3. Apresentar dados históricos existentes quando houver.

4. Confirmar polo/categoria permitidos.

5. Apresentar Temporada.

6. Explicar Ranking.

7. Configurar disponibilidade.

8. Apresentar Jogar.

9. Apresentar Equipes e situação atual.

10. Apresentar Hunter como opcional.

11. Entrar no Player Hub.

> MENSAGEM PARA HISTÓRICOS
> Você já faz parte da história. Seus jogos e resultados oficiais já começaram a construir sua carreira UR.

## 24. ESTADOS FUNCIONAIS PADRONIZADOS

| Domínio              | Estados conceituais                                                   |
| -------------------- | --------------------------------------------------------------------- |
| Conta                | Invited · Active · Blocked                                            |
| Atleta               | Ativo · Confirmado por participação · Pendente de confirmação         |
| Competição           | Eligible · Ineligible · Qualified · Not qualified · Pending           |
| Equipe               | Livre · Convidado · Membro · Saída pendente                           |
| Equipe institucional | Candidata · Reconhecida · Oficial · Inativa/Suspensa                  |
| Formação             | Em montagem · Completa · Elegível · Ativa · Encerrada                 |
| Hunter               | Not enrolled · Interested · Enrolled · Paused · Cycle completed       |
| Agenda               | Interest · Reserved · Waitlisted · Checked-in · Participated/Consumed |

Nomes técnicos finais podem diferir, mas a semântica não pode ser fundida.

## 25. SISTEMA DE DESIGN E EXPERIÊNCIA

### 25.1 Identidade

- Logo oficial recuperada e preservada

- Preto/grafite/branco/dourado

- Fotografia real aprovada

- Textura esportiva discreta

- Luz de arena

- Areia quando contextual

- Profundidade e contraste

### 25.2 Composição

- Menos bordas

- Menos cards repetidos

- Seções contínuas

- Hierarquia forte

- Elementos de placar

- Timeline

- Barras de progresso

- Carrosséis

- Mini gráficos quando úteis

- Bottom sheets no mobile

### 25.3 Motion

- Confirmação

- Mudança de ranking

- Conquista

- UR Coins

- Entrada em etapa

- Carregamento

- Transições discretas

- Respeitar reduced motion

### 25.4 Regra mobile

Touch targets adequados, safe area iOS, navegação inferior persistente, conteúdo prioritário acima da dobra e ausência de dependência de hover.

## 26. BIBLIOTECA DE COMPONENTES A PRESERVAR/CONSTRUIR

- AthleteShell

- BottomNav

- BrandMark oficial

- PlayerHero

- PlayerCard

- CareerProgress

- SeasonRoadmap

- RankingPosition

- RankingRivals

- RankingPodium

- MatchCard

- OpportunityCard

- TeamHero

- TeamRoster

- FormationCard

- RecruitmentCard

- TeamProgress

- RewardCard

- PrizeCard

- HunterHero

- HunterTrack

- HunterPlan

- StatBlock

- Milestone

- Achievement

- Timeline

- Notification

- EmptyState

- ErrorState

- Skeleton

- BottomSheet

- Modal

- Toast

- SourceHealth/partial-state

## 27. ESTADOS VISUAIS OBRIGATÓRIOS

- Loading

- Empty

- Partial

- Ready

- Error

- Offline quando aplicável

- Read-only Preview

Nenhuma tela pode quebrar ou inventar conteúdo quando parte das fontes estiver indisponível.

## 28. CONTRATOS DE DADOS E FONTES DE VERDADE

| Domínio                | Fonte conceitual                         |
| ---------------------- | ---------------------------------------- |
| Identidade             | Athlete/Profile vinculados               |
| Ranking                | Ledger canônico → projeção               |
| UR Coins               | Ledger URC separado                      |
| Resultados atuais      | Fluxo operacional homologado             |
| Histórico              | Read model histórico seguro / RPC        |
| Equipes                | Team + memberships + formações temporais |
| Contribuição de equipe | Atribuição no timestamp do evento        |
| Agenda                 | Sessões/oportunidades publicadas         |
| Hunter                 | Plano/prioridades/status publicados      |
| Market                 | Ofertas e redemptions                    |
| Feedback               | Casos/threads permitidos ao atleta       |
| Temporada              | Season context canônico                  |

### 28.1 Regras de dados

- Não usar frontend hardcoded como fonte de verdade quando houver backend.

- Não preencher data histórica desconhecida.

- Não atribuir equipe retroativamente sem evidência.

- Reversões herdam atribuição apropriada do evento original.

- Read models não são editados manualmente para corrigir ledgers.

## 29. SEGURANÇA E PRIVACIDADE

- RLS em superfícies de atleta.

- Sem service role no cliente.

- Sem impersonation.

- Preview read-only.

- Sem notas internas, evidências, operadores ou recomendações do Command no App.

- Perfil público limitado a dados esportivos aprovados.

- Ações econômicas e competitivas críticas server-side/RPC.

- Logs sem vazamento de segredo.

## 30. PWA, OFFLINE E RESILIÊNCIA

Athlete App pode cachear leitura recente de Home, agenda, ranking e perfil quando seguro. Reservas, resgates, Coins, transferências e ações críticas exigem confirmação server-side. Court Ops mantém estratégia offline-first própria.

## 31. ACESSIBILIDADE

- Contraste

- Touch target

- ARIA

- Teclado no desktop

- Estados não dependentes apenas de cor

- Textos legíveis

- Reduced motion

- Leitura por screen reader

- Safe areas

## 32. PERFORMANCE

- Mobile 4G como referência.

- Imagens responsivas/lazy loading.

- Evitar dezenas de consultas por tela.

- Snapshots/queries agregadas quando apropriado.

- Server Components quando seguros.

- Cache somente onde não compromete consistência.

- Skeletons em vez de saltos de layout.

## 33. RELAÇÃO COM O COMMAND CENTER

O Command é a sala operacional. O Athlete App é a experiência do atleta.

| Command controla         | Athlete App apresenta         |
| ------------------------ | ----------------------------- |
| Atletas e acessos        | Identidade e carreira         |
| Sessões e staff          | Jogar                         |
| Resultados e homologação | Resultados/Histórico          |
| Ranking/ledgers          | Classificação                 |
| Equipes e formações      | Minha equipe/ecossistema      |
| Hunter                   | Plano e conteúdos publicados  |
| Market                   | Ofertas e resgates            |
| Feedback                 | Protocolo e status permitidos |
| Mídia                    | Destaques publicados          |
| Temporada                | Campanha e elegibilidade      |

> REGRA
> O Athlete App nunca cria uma regra paralela para compensar ausência do Command.

## 34. CICLO OPERACIONAL DE UM UR PLAY

1. Publicar sessão/oportunidade.

2. Atletas demonstram interesse/reservam conforme regra.

3. Waitlist quando lotado.

4. Pré-operação resolve lista e créditos.

5. Check-in.

6. Preflight.

7. Abrir Court Ops.

8. Registrar confrontos/rallies/resultados.

9. Encerramento técnico.

10. Homologação.

11. Gerar transactions canônicas.

12. Atualizar ranking/projeções.

13. Gerar UR Coins apenas quando regra aplicável.

14. Atualizar histórico.

15. Atualizar equipe/contribuições.

16. Publicar destaques quando existirem.

17. Pós-Sessão 360.

## 35. CICLO OPERACIONAL DE UMA EQUIPE

1. Candidatura.

2. Validação de responsável e polo.

3. Criação de identidade.

4. Convites/aceites de atletas.

5. Montagem de duplas e quartetos.

6. Validação de roster e elegibilidade.

7. Oficialização quando critérios forem atingidos e houver vaga.

8. Competição.

9. Ranking e contribuição.

10. Recrutamento/expansão.

11. Avaliação de profissionalização.

12. Premiações/repasses homologados.

13. Renovação, evolução ou perda de status conforme regra.

## 36. ANALYTICS DO PRODUTO

- login

- home_viewed

- opportunity_viewed

- interest_created

- reservation_created

- waitlist_joined

- checkin_completed

- ranking_viewed

- season_viewed

- team_viewed

- team_invite

- team_accept

- hunter_viewed

- hunter_interest

- market_viewed

- redemption

- feedback_created

- highlight_viewed

Analytics deve medir uso e funil sem substituir os ledgers competitivos/econômicos.

## 37. CONTEÚDO E COPY

- Linguagem atleta-first.

- Evitar jargão administrativo.

- Explicar estados e consequências.

- Mostrar oportunidade e próximo passo.

- Usar linguagem de carreira, competição e desenvolvimento.

- Não prometer benefício não contratado.

- Não transformar escassez em manipulação.

### 37.1 Vocabulário recomendado

| Evitar                                     | Preferir                                    |
| ------------------------------------------ | ------------------------------------------- |
| Módulo                                     | Área / jornada                              |
| Dashboard                                  | Player Hub / Início                         |
| Cadastrar disponibilidade para matchmaking | Diga quando você pode jogar                 |
| Consultar classificação                    | Ver quem está na sua frente                 |
| Status operacional                         | Situação                                    |
| Consumir crédito                           | Crédito usado conforme participação/reserva |

## 38. DADOS DE LANÇAMENTO E ATIVAÇÃO

A base mestre de atletas deve ser reconciliada com Production. Atletas cadastrados na Planilha Mestre são considerados ativos no ecossistema; confirmação esportiva ocorre após primeira participação em UR Play. Quem já participou dos jogos históricos válidos deve entrar como confirmado.

- Reconciliar atletas mestre × athletes × profiles/Auth.

- Resolver aliases/duplicidades.

- Vincular histórico aos atletas corretos.

- Preservar jogos históricos já homologados.

- Preencher datas históricas somente com evidência.

- Cadastrar próximas sessões reais.

- Popular equipes, formações e quartetos com vínculos válidos.

- Disponibilizar oportunidades/premiações reais no lançamento.

## 39. CRITÉRIOS DE CONCLUSÃO DO ATHLETE APP V1

### 39.1 Definição operacional de pronto

> DONE
> Um atleta recebe acesso, entra sozinho, reconhece sua identidade e histórico, entende a temporada, encontra um UR Play, reserva quando elegível, comparece, joga, tem resultado homologado, vê histórico e ranking atualizados, recebe economia aplicável, acompanha sua equipe e encontra oportunidades — enquanto o Command administra o ciclo sem intervenção direta no banco.

### 39.2 Gates

| Gate       | Critério                                                          |
| ---------- | ----------------------------------------------------------------- |
| Produto    | Fluxos completos e hierarquia mobile aprovados                    |
| Dados      | Atletas/histórico/equipes reconciliados                           |
| Auth       | Primeiro acesso e recuperação funcionais                          |
| Agenda     | Sessões reais publicadas                                          |
| Court Ops  | Ao menos uma sessão nativa concluída ponta a ponta                |
| Ranking    | Histórico + nova sessão atualizam ledger/projeção corretamente    |
| UR Coins   | Primeira concessão real conforme regra, sem lançamento arbitrário |
| Market     | Ao menos uma oferta/resgate ponta a ponta                         |
| Equipes    | Roster/formações/recrutamento/trilha visíveis                     |
| Quartetos  | Fluxo nativo de formação/elegibilidade preparado                  |
| Hunter     | Área própria + opt-in + plano publicado quando aplicável          |
| Preview    | Read-only validado                                                |
| QA         | Desktop/mobile + Quality + Isolated QA verdes                     |
| Production | Migrations alinhadas, smoke, logs, rollback                       |

## 40. MATRIZ DE UAT

Executar em atleta real, admin-atleta e Preview; mobile prioritário, desktop secundário.

- Início

- Jogar/Agenda

- Disponibilidade

- Arenas

- Resultados

- Histórico

- Ranking

- Temporada

- Evolução

- Hunter

- Equipe

- Ecossistema de Equipes

- Recrutamento

- Quartetos

- Oportunidades

- Wallet

- Market

- Destaques

- Perfil

- Feedback

- Notificações

- Preview

### 40.1 Severidade

| Classe | Definição                                                                          |
| ------ | ---------------------------------------------------------------------------------- |
| P0     | Bloqueia acesso, segurança, dinheiro, resultado, ranking, operação ou integridade. |
| P1     | Quebra jornada essencial ou causa interpretação operacional relevante.             |
| P2     | Melhoria visual, performance ou conforto sem bloquear uso seguro.                  |

Somente P0/P1 bloqueiam release; P2 entra em backlog priorizado.

## 41. RELEASE, DEPLOY E ROLLBACK

- SHA candidato congelado.

- Quality verde.

- Isolated QA verde.

- UAT final verde.

- Production audit.

- Migrations forward-only.

- Sem direct-write corretivo em tabelas de negócio.

- Backup/PITR confirmado.

- Smoke pós-deploy.

- Rollback frontend para SHA/deployment anterior.

- Rollback de banco por migration forward-only; PITR apenas em corrupção real.

- Revalidar invariantes de ranking/histórico/economia após rollback.

## 42. ORDEM DE CONSTRUÇÃO A PARTIR DESTE DOCUMENTO

| Fase                       | Objetivo                                                                           |
| -------------------------- | ---------------------------------------------------------------------------------- |
| Fase A — Esqueleto UX      | Shell mobile, navegação, Home, Jogar, Ranking, Temporada, Evolução, Hunter, Perfil |
| Fase B — Equipes           | Equipe, duplas, quartetos, recrutamento, profissionalização, vagas oficiais        |
| Fase C — Oportunidades     | Premiações, repasses, Central de Oportunidades, destaques e benefícios             |
| Fase D — Dados reais       | Reconciliação mestre, Auth, histórico, próximas sessões, equipes/formações         |
| Fase E — Economia          | UR Coins e Market com conteúdo real                                                |
| Fase F — Piloto Production | Primeira sessão nativa ponta a ponta                                               |
| Fase G — Launch Gate       | UAT, QA, audit, deploy e abertura controlada                                       |

> DISCIPLINA DE ESCOPO
> Não reabrir arquitetura central durante essas fases. Novas ideias entram somente se encaixarem nos eixos existentes ou forem registradas como expansão pós-V1.

## 43. EXPANSÕES PÓS-V1 JÁ PREVISTAS, MAS NÃO BLOQUEANTES

- Draft completo.

- Janela de transferências avançada.

- Perfil público mais rico.

- Feed esportivo social.

- Push notifications completas.

- Analytics avançado.

- Patrocínios e ativações automatizadas.

- Marketplace ampliado.

- Conteúdo Hunter com LMS mais completo.

- Diário/reflexão Hunter.

- Treinos/CT UR.

- Múltiplas modalidades.

- Automação mais profunda de Series/Cup/Legends.

## 44. TOMADAS DE DECISÃO AINDA NECESSÁRIAS

Estas decisões devem ser resolvidas antes das respectivas implementações; não bloqueiam o congelamento da arquitetura.

| ID     | Decisão                                                             | Observação                             |
| ------ | ------------------------------------------------------------------- | -------------------------------------- |
| DEC-01 | Número inicial de vagas de equipes oficiais por polo/categoria      | Depende de capacidade operacional real |
| DEC-02 | Critérios objetivos de cada estágio da trilha de profissionalização | Definir regulamento                    |
| DEC-03 | Limite final de duplas/quartetos por equipe e categoria             | Alinhar ao regulamento oficial         |
| DEC-04 | Janela e regras de transferência                                    | Pode ser pós-V1                        |
| DEC-05 | Critérios e governança para entrada no Hunter                       | Definir processo operacional           |
| DEC-06 | Modelo econômico futuro do Hunter                                   | Gratuito, pago, assinatura ou híbrido  |
| DEC-07 | Catálogo inicial real do Market                                     | Selecionar 3–5 ofertas                 |
| DEC-08 | Primeiras regras de UR Coins ativas no lançamento                   | Somente eventos homologados            |
| DEC-09 | Política de fotos públicas                                          | Aprovação/moderação e consentimento    |
| DEC-10 | Quais benefícios de parceiros já podem ser prometidos no V1         | Somente contratos/ativos reais         |

## 45. MENSAGEM-MESTRE DO ECOSSISTEMA

> O QUE O ATLETA PRECISA ENTENDER
> Você não entrou apenas em uma liga. Entrou em um ecossistema onde cada jogo pode construir ranking, histórico, evolução, equipe, reconhecimento, oportunidades e recompensas. O caminho pode levar do UR Play às principais competições da temporada e, para quem quiser se desenvolver ainda mais, ao Hunter.

> O QUE A EQUIPE PRECISA ENTENDER
> Ser uma equipe oficial Ultimate Rivals é conquistar espaço dentro de uma estrutura que incentiva profissionalização, captação de atletas, formações competitivas, mídia, oportunidades, premiações e repasses. A vaga precisa ter valor porque o status oficial precisa representar mérito, organização e contribuição.

## ANEXO A — MAPA COMPLETO DO CICLO DO ATLETA

Descoberta → Cadastro → Primeiro acesso → Identidade → Histórico inicial → Temporada → Disponibilidade → Jogar → Interesse/Reserva/Waitlist → Check-in → Partida → Resultado → Homologação → Histórico → Ranking → Evolução → Equipe → Oportunidades → UR Coins → Market → Classificação → Series → Cup → Legends → Virada → Nova temporada.

Trilha opcional paralela: Hunter → Interesse → Entrada → Plano → Aprender → Aplicar → Avaliar → Revisar → Evoluir → Novo ciclo.

## ANEXO B — MAPA COMPLETO DO CICLO DA EQUIPE

Candidatura → Identidade → Roster → Duplas/Quartetos → Validação → Oficialização → Competição → Ranking → Recrutamento → Expansão → Profissionalização → Oportunidades → Mídia → Premiações/Repasses → Renovação de status.

## ANEXO C — CHECKLIST DE CONTINUIDADE PARA OUTRAS CONVERSAS

1. Confirmar que este documento é a base vigente.

2. Identificar a fase da roadmap em execução.

3. Consultar ADRs congeladas.

4. Não reconstruir shell, ledgers, Preview ou separação Command/App.

5. Usar dados reais; não inventar progressão.

6. Validar impacto em mobile primeiro.

7. Se houver alteração estrutural, registrar nova decisão antes de codificar.

8. Ao terminar um bloco, atualizar Documento Mestre e Release Checklist.
