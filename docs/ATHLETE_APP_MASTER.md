# Documento Mestre — Ultimate Rivals Athlete App

> **Status:** fonte de verdade arquitetural e funcional do Athlete App
>
> **Versão:** V3 — 2026-08-28
>
> **Escopo:** continuidade do produto até o Launch Gate V1
>
> **Origem:** conteúdo autoritativo fornecido para o P00 e versionado no repositório

## 1. Finalidade e precedência

Este documento consolida as decisões já aprovadas para o Athlete App do Ultimate
Rivals. Ele deve orientar produto, frontend, backend, banco de dados, segurança,
experiência mobile-first e QA durante os prompts P00 a P18.

O documento define a arquitetura de produto e os contratos que não devem ser
reabertos durante a execução. O repositório, a `main`, os PRs, os workflows, as
migrations e os ambientes continuam sendo a fonte operacional do estado atual.
Quando o código divergir desta arquitetura, a divergência deve ser registrada,
classificada e encaminhada ao prompt responsável; ela não autoriza reconstrução,
correção fora de escopo nem alteração silenciosa da decisão aprovada.

Em caso de conflito entre uma conveniência visual e um dado real, o dado real
prevalece. Em caso de ausência de dado, a interface deve representar a ausência de
forma honesta, sem inventar conteúdo para completar a experiência.

## 2. Escopo do produto

O Athlete App é a experiência esportiva, imersiva e orientada à carreira do atleta.
Ele representa a jornada de jogar, competir, evoluir, fortalecer equipes, ganhar
reconhecimento e acessar benefícios reais do ecossistema Ultimate Rivals.

O Command Center é um produto separado e permanece como a superfície operacional e
administrativa completa. Os dois produtos compartilham backend, entidades,
contratos, RPCs e ledgers, mas não compartilham a mesma experiência visual nem a
mesma finalidade de uso.

O Athlete App não deve ser reconstruído do zero. O `AthleteShell` é preservado e
evoluído progressivamente. Funcionalidades válidas já implementadas devem ser
protegidas durante as refatorações dos prompts seguintes.

## 3. Princípios aprovados e imutáveis

1. O Athlete App e o Command Center são produtos separados.
2. O Athlete App continua usando `AthleteShell`.
3. O Command Center é a superfície operacional e administrativa completa.
4. O Athlete App é a experiência esportiva, imersiva e orientada à carreira.
5. Command Center e Athlete App compartilham backend, entidades, contratos, RPCs e
   ledgers, mas não a mesma experiência visual.
6. O Preview administrativo continua sendo somente leitura.
7. Não usar impersonation.
8. Não ignorar nem contornar RLS.
9. Ranking Points e UR Coins são ledgers separados.
10. Não criar engine paralela de XP, badges, missões ou progressão fictícia.
11. O histórico esportivo homologado faz parte da carreira do atleta.
12. Datas históricas desconhecidas não podem ser inventadas.
13. Equipes são um dos eixos centrais do aplicativo.
14. Duplas e quartetos são formações competitivas nativas.
15. Formações são temporais e vinculadas a temporada ou ciclo.
16. Nenhuma transferência ou vínculo de equipe pode ser inferido implicitamente.
17. Convite e aceite são obrigatórios para entrada do atleta em equipe.
18. Hunter é uma área especial e opt-in de desenvolvimento.
19. Hunter não é XP geral do aplicativo.
20. Hunter deve funcionar como Escola de Desenvolvimento UR.
21. A evolução esportiva comum permanece separada do Hunter.
22. Mobile-first é regra.
23. Desktop é adaptação funcional do produto mobile.
24. O aplicativo não pode voltar a parecer um portal administrativo composto por
    várias janelas independentes.
25. O design deve criar sensação de carreira esportiva, progressão e “Rumo ao
    Estrelato”.
26. Dados reais têm precedência sobre preenchimento visual.
27. Informação inexistente nunca deve virar número, badge, score, recomendação ou
    progressão fictícia.
28. Interesse, reserva, lista de espera, check-in e participação são estados
    distintos.
29. Disponibilidade não é reserva.
30. Correções de ranking, UR Coins, resultados, elegibilidade, equipe ou repasse não
    podem ser feitas por escrita direta corretiva.
31. Mudanças de banco devem ser forward-only e feitas por migration, RPC ou serviço
    auditável.
32. Premiações, repasses, benefícios e oportunidades devem ganhar visibilidade no
    Athlete App quando forem reais e vigentes.
33. Equipes precisam possuir trilha de profissionalização, recrutamento, crescimento,
    duplas, quartetos, ranking, oportunidades, mídia, benefícios e repasses.
34. Vagas de equipes oficiais podem ser disputadas e limitadas por capacidade real de
    polo e categoria.
35. Não criar escassez artificial.
36. A logo utilizada deve ser a logo oficial já recuperada e versionada.

## 4. Jornadas do produto

### 4.1 Jornada central do atleta

Entrar → Jogar → Competir → Gerar resultado → Ganhar pontos → Subir no ranking →
Evoluir → Fortalecer sua equipe → Ganhar reconhecimento → Conquistar oportunidades
→ Ganhar UR Coins → Resgatar benefícios → Classificar-se → Avançar na temporada →
Jogar novamente.

Essa sequência representa uma carreira esportiva contínua. As superfícies do app
devem conectá-la sem transformar cada etapa em uma janela administrativa isolada.

### 4.2 Jornada Hunter

Conhecer → Demonstrar interesse → Entrar → Receber plano → Aprender → Aplicar →
Revisar → Evoluir → Novo ciclo.

Hunter corre em paralelo à jornada esportiva comum. A participação é opt-in, os
planos e ciclos devem ser reais e a evolução Hunter não pode ser usada como XP geral
do aplicativo.

## 5. Navegação e experiência

### 5.1 Referência mobile

A navegação mobile principal possui exatamente cinco destinos:

1. Início
2. Jogar
3. Ranking
4. Hunter
5. Perfil

O mobile é a referência arquitetural e de experiência. Hierarquia, foco, ações,
densidade, navegação e estados devem ser resolvidos primeiro para a tela pequena.

### 5.2 Adaptação desktop

O desktop pode expandir a navegação em agrupamentos como Carreira e Ecossistema,
desde que continue sendo uma adaptação funcional do produto mobile. Ele não deve
comandar a arquitetura, reintroduzir uma lógica de portal administrativo nem separar
a jornada em várias janelas independentes.

### 5.3 Linguagem de produto

A experiência deve comunicar carreira esportiva, pertencimento, progresso real e
“Rumo ao Estrelato”. Progressão visual só pode representar estados, resultados,
pontuação, planos, benefícios ou marcos que existam nos dados e contratos oficiais.

## 6. Contratos de dados e segurança

### 6.1 Dados reais e estados explícitos

- Dados reais precedem preenchimento visual.
- Ausência de informação deve permanecer ausência, desconhecido, indisponível ou
  estado equivalente; não deve virar zero quando zero tiver significado esportivo ou
  econômico.
- Datas históricas desconhecidas permanecem nulas ou explicitamente desconhecidas.
- Interesse não equivale a reserva.
- Reserva não equivale a lista de espera.
- Lista de espera não equivale a check-in.
- Check-in não equivale a participação.
- Disponibilidade não cria nem implica reserva.
- Capacidade e escassez só podem ser apresentadas quando derivadas de limites reais
  de polo, categoria, formação, evento ou operação.

### 6.2 Autenticação, autorização e Preview

- O atleta usa sua identidade e seus próprios contratos de acesso.
- O Preview administrativo é somente leitura e não altera a identidade autenticada.
- Impersonation é proibida.
- RLS não pode ser ignorada ou contornada para viabilizar a experiência.
- Ações mutáveis devem respeitar autenticação, autorização, políticas, RPCs e
  serviços auditáveis existentes.
- O Preview não pode reservar, entrar em lista de espera, confirmar check-in,
  aceitar vínculo, resgatar oferta ou executar qualquer outra mutação em nome do
  atleta.

### 6.3 Ledgers e correções

Ranking Points e UR Coins são domínios e ledgers distintos. Pontos esportivos não
podem ser tratados como moeda, e saldo econômico não pode ser usado como progressão
esportiva.

Correções de ranking, UR Coins, resultados, elegibilidade, equipe ou repasse não
podem ser feitas por escrita direta corretiva. Toda mudança de banco é forward-only e
deve passar por migration, RPC ou serviço auditável, preservando rastreabilidade e
idempotência quando aplicável.

Não deve existir engine paralela de XP, badges, missões ou progressão para simular
atividade. Elementos de reconhecimento só aparecem quando forem derivados de
contratos e dados reais.

## 7. Contratos esportivos

### 7.1 Ranking, resultados e histórico

- O ranking individual deve refletir o ledger e os contratos oficiais de pontuação.
- Rankings de duplas e quartetos devem representar as formações competitivas nativas
  correspondentes, sem agregação fictícia.
- Resultados que geram efeito esportivo devem ser homologados conforme os contratos
  oficiais.
- O histórico homologado integra a carreira do atleta.
- A incorporação de histórico não autoriza inventar datas, resultados, pontuação ou
  impacto econômico.
- Ranking, resultados e histórico devem permanecer reconciliáveis e auditáveis.

### 7.2 Temporada

A temporada organiza ciclos, classificação e avanço esportivo. Fases, marcos,
calendário, posição, elegibilidade e progresso só podem ser exibidos como fatos
quando existirem em fontes reais. Conteúdo estático não pode se apresentar como
estado real da temporada.

### 7.3 Evolução comum

A evolução comum representa desenvolvimento esportivo derivado da prática, de
resultados, de avaliações e de fontes oficiais disponíveis. Ela permanece separada
do Hunter e não pode depender de badges, missões, estágios ou recomendações
inventadas.

### 7.4 Hunter

Hunter é a Escola de Desenvolvimento UR e uma área especial, voluntária e opt-in.
Sua jornada inclui interesse, entrada, plano, aprendizagem, aplicação, revisão,
evolução e novo ciclo. Plano, etapa, recomendação e progresso Hunter precisam existir
em dados e contratos próprios; não podem ser inferidos de lacunas nem reutilizados
como progressão geral do app.

## 8. Equipes e formações

### 8.1 Equipes como eixo central

Equipes são parte permanente da arquitetura e da carreira. A experiência deve
conectar vínculo, contribuição, ranking, crescimento, mídia, oportunidades,
benefícios, premiações e repasses sem reduzir a equipe a um cadastro administrativo.

### 8.2 Vínculos e recrutamento

- Nenhuma transferência, entrada ou vínculo pode ser inferido implicitamente.
- Convite e aceite são obrigatórios para a entrada do atleta em uma equipe.
- A disponibilidade do atleta não constitui aceite de vínculo.
- Recrutamento deve preservar estado, autoria, temporalidade e consentimento.
- Vagas de equipes oficiais podem ser disputadas e limitadas apenas por capacidade
  real de polo e categoria.
- Escassez artificial é proibida.

### 8.3 Duplas e quartetos

Duplas e quartetos são formações competitivas nativas. Ambas são temporais e
vinculadas à temporada ou ao ciclo pertinente. Composição, vigência, ranking,
resultado e elegibilidade não podem ser derivados de um vínculo permanente
implícito.

### 8.4 Trilha de profissionalização

A trilha de profissionalização das equipes é parte permanente do produto. Ela deve
conectar recrutamento, crescimento, duplas, quartetos, ranking, oportunidades,
mídia, benefícios e repasses com dados reais. O detalhamento funcional e a execução
pertencem aos prompts P09 a P11.

## 9. Oportunidades, premiações, repasses e benefícios

O Athlete App deve tornar visíveis oportunidades, premiações, repasses e benefícios
quando forem reais, vigentes e elegíveis para o atleta ou sua equipe.

- Oportunidade não pode ser criada apenas para preencher uma tela.
- Premiação anunciada deve corresponder a um contrato ou dado oficial vigente.
- Repasse deve preservar origem, destinatário, estado e trilha auditável.
- Benefício e oferta devem respeitar vigência, elegibilidade, disponibilidade e
  regras reais de resgate.
- Saldo ausente não pode ser apresentado como saldo zero sem que a fonte confirme
  esse valor.
- A UI deve distinguir oportunidade, benefício, premiação e repasse; os conceitos
  não são intercambiáveis.

## 10. Superfícies funcionais

As superfícies abaixo compõem a conclusão planejada do Athlete App. Elas não
autorizam implementação fora do prompt correspondente.

- **Design System e AthleteShell:** materializam a referência mobile-first,
  preservam `AthleteShell`, a navegação principal e a adaptação desktop.
- **Início / Player Hub:** sintetiza a carreira e conduz à próxima ação real sem
  montar um painel de cartões desconectados nem inventar missões.
- **Jogar:** reúne oportunidades reais de jogar e preserva os estados distintos de
  interesse, reserva, lista de espera, check-in e participação.
- **Ranking:** apresenta ranking individual, de duplas e de quartetos pelos contratos
  oficiais.
- **Resultados e Histórico:** integram resultados homologados e carreira histórica,
  preservando datas desconhecidas.
- **Temporada:** representa classificação, fase, ciclo e avanço com fontes reais.
- **Evolução:** apresenta desenvolvimento esportivo comum sem absorver Hunter.
- **Hunter:** oferece a jornada opt-in da Escola de Desenvolvimento UR.
- **Equipes:** trata equipe como eixo de carreira e inclui a trilha de
  profissionalização.
- **Recrutamento e Quartetos:** implementa consentimento por convite e aceite, além
  da formação competitiva temporal.
- **Oportunidades, Premiações e Repasses:** dá visibilidade a benefícios esportivos e
  econômicos reais e vigentes.
- **Perfil, Mídia, Notificações e Onboarding:** consolida identidade, presença pública
  autorizada, comunicação e entrada esportiva sem expor dados privados.
- **Wallet e Market:** apresenta o ledger de UR Coins e resgates reais sem misturar
  moeda com ranking.

## 11. Dados de lançamento e reconciliação

O lançamento deve usar fontes reais e reconciliadas. O P14 é responsável por
inventariar, confrontar e documentar a disponibilidade, a integridade e as lacunas
dos dados necessários, sem preencher essas lacunas artificialmente.

A reconciliação deve abranger, quando existirem no escopo operacional:

- identidade, perfil, autenticação e autorização do atleta;
- calendário, interesse, disponibilidade, reserva, lista de espera, check-in e
  participação;
- competições, resultados homologados e histórico;
- Ranking Points e suas transações;
- temporadas, ciclos, classificações e elegibilidade;
- equipes, convites, aceites, vínculos e vigências;
- duplas e quartetos temporais;
- interesse, admissão, planos e ciclos Hunter;
- oportunidades, premiações, repasses e benefícios;
- UR Coins, wallet, ofertas e resgates;
- mídia publicável, notificações e onboarding.

Uma lacuna de lançamento deve ser registrada como pendência real, não transformada
em zero, badge, score, recomendação, disponibilidade, capacidade ou progresso
fictício. Datas desconhecidas continuam desconhecidas. Divergências de banco devem
ser tratadas somente em prompts autorizados, por mudanças forward-only e
auditáveis.

## 12. UAT, release e operação

### 12.1 UAT

O UAT mobile valida a experiência de referência nos cinco destinos principais e nas
jornadas essenciais. O UAT desktop valida a adaptação funcional sem permitir que o
desktop redefina a experiência. Preview, Auth e RLS devem ser validados como
contratos de segurança, inclusive o caráter read-only do Preview.

P15 executa o piloto E2E Production apenas quando explicitamente autorizado. P16
executa o UAT final. Nenhuma etapa anterior recebe autorização implícita para alterar
Production.

### 12.2 Quality e Isolated QA

Cada prompt deve executar validações proporcionais ao tipo de mudança e registrar a
evidência. Mudanças documentais exigem validação documental e de formatação. Mudanças
de código ou contrato seguem os gates de Quality e, quando aplicável, Isolated QA.
Dispensa de um gate deve ser explícita e justificada.

### 12.3 Production Audit e deploy

P17 é responsável pela auditoria de Production e pelo deploy autorizado. O estado
real deve ser revalidado imediatamente antes da ação; SHA, CI, migrations, dados e
deploys anteriores nunca podem ser presumidos a partir de um relato antigo.

### 12.4 Backup, rollback e smoke

Backup, rollback e smoke são gates obrigatórios de release. Antes de qualquer ação
mutável em Production, o runbook aplicável, a evidência de backup, o SHA candidato e
o caminho de recuperação devem estar identificados. Como mudanças de banco são
forward-only, rollback não autoriza escrita direta corretiva nem reversão destrutiva
de ledger, resultado ou vínculo.

Os procedimentos operacionais detalhados, responsáveis, evidências e critérios de
aprovação de backup, rollback e smoke devem ser fechados nos prompts P17 e P18 com
base no ambiente real. Este documento não inventa comandos, tempos ou mecanismos que
não tenham sido verificados.

### 12.5 Launch Gate

P18 decide o Launch Gate V1 com evidências atuais. O lançamento não pode ser
declarado concluído por intenção, aparência visual ou execução parcial. A decisão
deve referenciar o SHA exato, os gates do Release Checklist, os resultados de UAT e
QA, a auditoria de Production e as pendências classificadas.

## 13. Critérios de conclusão

O Athlete App V1 só pode ser considerado concluído quando:

1. A sequência autorizada P00 a P18 tiver sido executada e revisada sem antecipar
   prompts futuros.
2. A experiência mobile preservar os cinco destinos aprovados e o desktop for uma
   adaptação funcional.
3. `AthleteShell`, a separação entre produtos e o Preview read-only estiverem
   preservados.
4. Dados reais sustentarem os estados esportivos, econômicos e de desenvolvimento,
   sem progressão fictícia.
5. Ranking Points e UR Coins permanecerem separados e auditáveis.
6. Resultados homologados e histórico integrarem a carreira sem datas inventadas.
7. Equipes, recrutamento por convite e aceite, duplas, quartetos e temporalidade
   estiverem cobertos.
8. Hunter funcionar como área opt-in e separada da evolução comum.
9. Oportunidades, premiações, repasses e benefícios reais e vigentes estiverem
   visíveis nos contextos aplicáveis.
10. O Release Checklist contiver evidência para Product UX, UAT, segurança, dados,
    Quality, Production Audit, backup, rollback, smoke e SHA.
11. Não houver P0 aberto; P1 e P2 estiverem explicitamente resolvidos, aceitos ou
    encaminhados conforme o Launch Gate autorizado.
12. P14 tiver reconciliado os dados reais, P15 tiver produzido a evidência do piloto
    autorizado, P16 tiver concluído o UAT final, P17 tiver concluído a auditoria e o
    deploy autorizado, e P18 tiver registrado a decisão final.

## 14. Governança de mudanças

- Um prompt executa somente o próprio escopo e encerra com handoff verificável.
- Decisões estruturais aprovadas são registradas em ADRs e não são reabertas por uma
  refatoração local.
- Uma necessidade nova de negócio exige autorização explícita; não pode ser inferida
  de uma lacuna no código.
- Código válido não deve ser apagado apenas porque uma UX futura será diferente.
- Branches e PRs não mergeados devem ser auditados e ter seus contratos úteis
  preservados seletivamente; não devem ser mesclados por suposição.
- SHA, status de CI, branch, migrations e Production devem ser revalidados em cada
  etapa relevante.
- Production, dados reais, migrations e secrets só podem ser alterados quando o
  prompt correspondente trouxer autorização expressa e os gates aplicáveis forem
  atendidos.

## 15. Glossário de estados não equivalentes

- **Interesse:** manifestação de intenção; não garante vaga.
- **Disponibilidade:** declaração de que o atleta pode participar; não cria reserva.
- **Reserva:** vaga confirmada conforme o contrato operacional.
- **Lista de espera:** posição condicionada à abertura de vaga; não é reserva.
- **Check-in:** confirmação operacional de presença; não prova participação.
- **Participação:** ocorrência esportiva efetiva conforme a fonte oficial.
- **Vínculo de equipe:** relação temporal aceita pelo atleta; não pode ser inferida.
- **Formação:** composição competitiva temporal de dupla ou quarteto, vinculada ao
  ciclo ou à temporada.
- **Ranking Points:** pontuação esportiva do ledger de ranking.
- **UR Coins:** unidade do ledger econômico usada nos contratos próprios de wallet e
  market.
- **Hunter:** Escola de Desenvolvimento UR opt-in, separada da evolução esportiva
  comum.
