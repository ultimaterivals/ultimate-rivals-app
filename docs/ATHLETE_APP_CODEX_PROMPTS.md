# Sequência Oficial de Prompts — Ultimate Rivals Athlete App

> **Status:** contrato de execução oficial
>
> **Versão:** V1 — 2026-08-28
>
> **Documento complementar:** `docs/ATHLETE_APP_MASTER.md`

## 1. Finalidade

Este documento fixa a sequência de conclusão do Athlete App e impede que cada nova
execução reconstrua arquitetura, regras ou experiência já aprovadas. Os prompts P00 a
P18 devem ser executados na ordem autorizada, um por vez, com inspeção do estado real
do repositório antes de qualquer mudança.

Os títulos abaixo definem a ordem e a responsabilidade macro de cada etapa. O escopo
executável detalhado de um prompt futuro depende cumulativamente de:

1. `docs/ATHLETE_APP_MASTER.md`;
2. ADRs aceitas em `docs/decisions/`;
3. estado real do repositório e dos ambientes no momento da execução;
4. handoff aprovado do prompt anterior; e
5. texto completo do prompt explicitamente autorizado após a revisão externa.

O título de uma etapa não concede autorização para inferir novas regras de negócio,
alterar Production, aplicar migration, editar dados reais ou antecipar um prompt
posterior.

## 2. Protocolo obrigatório antes de editar

Em cada prompt, antes de editar, o executor deve:

1. Ler integralmente este documento, o Documento Mestre e os ADRs relevantes.
2. Inspecionar a `main` real e identificar seu SHA atual.
3. Listar branches e PRs relevantes para o escopo.
4. Verificar workflows e runs recentes aplicáveis.
5. Verificar migrations existentes quando o escopo envolver contratos de dados.
6. Identificar alterações ainda não mergeadas que precisem ser preservadas.
7. Comparar o código atual com o contrato do prompt e com o Documento Mestre.
8. Revalidar deploys e ambientes quando o prompt exigir informação operacional.
9. Preservar mudanças válidas existentes e alterações do usuário não relacionadas.
10. Registrar premissas e lacunas; não substituir evidência atual por SHA, CI, branch
    ou estado de ambiente mencionado anteriormente.

O repositório é a fonte operacional atual. O Documento Mestre é a fonte de verdade
arquitetural e funcional. Uma divergência entre ambos deve ser classificada e tratada
no prompt responsável.

## 3. Guardrails permanentes

Todos os prompts preservam os seguintes limites:

- Não reconstruir o projeto do zero nem propor uma nova arquitetura geral.
- Preservar `AthleteShell` e a separação entre Athlete App e Command Center.
- Manter o Preview administrativo somente leitura, sem impersonation e sem bypass de
  RLS.
- Manter Ranking Points e UR Coins em ledgers separados.
- Não criar XP, badges, missões, scores, recomendações ou progressão fictícia.
- Não inventar datas históricas nem preencher ausência de dado com zero quando zero
  tiver significado.
- Preservar a diferença entre interesse, disponibilidade, reserva, lista de espera,
  check-in e participação.
- Tratar equipes como eixo central, com convite e aceite obrigatórios para vínculo.
- Tratar duplas e quartetos como formações competitivas nativas, temporais e ligadas
  a temporada ou ciclo.
- Manter Hunter opt-in e separado da evolução esportiva comum.
- Fazer mudanças de banco somente de forma forward-only, por migration, RPC ou
  serviço auditável, quando o prompt trouxer autorização expressa.
- Tornar visíveis oportunidades, premiações, repasses e benefícios somente quando
  forem reais e vigentes.
- Manter mobile como referência da UX e desktop como adaptação funcional.
- Usar apenas a logo oficial recuperada e versionada.
- Não apagar código válido apenas porque um prompt posterior prevê outra UX.
- Não alterar secrets nem dados reais fora de autorização explícita.

## 4. Sequência oficial P00–P18

### P00 — Bootstrap documental e baseline

Versiona a fonte de verdade, registra ADRs e gates de release, inspeciona o estado
real e produz a matriz de conformidade. É uma etapa documental: não corrige
divergências funcionais, não altera migrations, Production, dados reais ou secrets e
não faz deploy.

### P01 — Design System + AthleteShell V2

Evolui o design system e o `AthleteShell` preservado a partir da referência
mobile-first, dos cinco destinos principais e da adaptação desktop aprovada. Não
reabre a separação entre Athlete App e Command Center.

### P02 — Home / Player Hub

Consolida a entrada da carreira e a próxima ação real do atleta, conectando a jornada
central sem transformar a Home em portal de cartões independentes ou inventar
missões e progressão.

### P03 — Jogar

Organiza a experiência de jogar e competir, mantendo explícitos os estados distintos
de interesse, disponibilidade, reserva, lista de espera, check-in e participação.

### P04 — Ranking

Consolida a apresentação do ranking oficial e seus contratos, incluindo a visão
individual e as bases necessárias para formações competitivas, sem misturar Ranking
Points e UR Coins.

### P05 — Resultados + Histórico

Integra resultados homologados e histórico esportivo à carreira. Preserva a origem
dos efeitos de ranking e mantém datas desconhecidas como desconhecidas.

### P06 — Temporada

Representa temporada, ciclos, classificação e avanço com dados reais, sem apresentar
fases, marcos ou progresso estático como estado confirmado.

### P07 — Evolução

Organiza a evolução esportiva comum com fontes oficiais disponíveis e mantém essa
jornada separada do Hunter.

### P08 — Hunter

Implementa Hunter como Escola de Desenvolvimento UR, especial e opt-in, com jornada,
planos e ciclos próprios. Hunter não se torna XP geral do aplicativo.

### P09 — Equipes

Consolida equipes como eixo central da carreira e inclui a trilha permanente de
profissionalização, preservando vínculos temporais e dados reais.

### P10 — Recrutamento + Quartetos

Implementa recrutamento com convite e aceite, sem vínculo implícito, e consolida
quartetos como formações competitivas nativas e temporais junto aos contratos de
duplas.

### P11 — Oportunidades + Premiações + Repasses

Dá visibilidade a oportunidades, premiações, repasses e benefícios reais, vigentes e
auditáveis para atletas e equipes, sem criar escassez artificial.

### P12 — Perfil + Mídia + Notificações + Onboarding

Consolida identidade, perfil esportivo, mídia autorizada, comunicação e entrada na
jornada do atleta, respeitando privacidade, autenticação e contratos reais.

### P13 — Wallet + Market

Consolida o ledger de UR Coins, saldo, movimentações, ofertas e resgates reais. Não
usa moeda como ranking nem transforma dado econômico ausente em valor inventado.

### P14 — Reconciliação de dados reais

Inventaria e reconcilia fontes, contratos e lacunas necessários ao lançamento. Não
preenche lacunas visualmente e só autoriza mudanças de banco quando o texto completo
do prompt definir o mecanismo forward-only e os gates correspondentes.

### P15 — Piloto E2E Production

Executa o piloto ponta a ponta em Production somente com autorização expressa,
escopo controlado, evidência e salvaguardas definidos no prompt completo. O título
isolado não autoriza mutação nem deploy.

### P16 — UAT final

Executa e registra o UAT final mobile e desktop, incluindo jornadas críticas,
Preview, autenticação, segurança e estados de dados. Classifica achados sem ocultar
P0, P1 ou P2.

### P17 — Auditoria Production + Deploy

Revalida Production, migrations, dados, backup, rollback, CI e SHA candidato e só
então executa o deploy autorizado nos termos do prompt completo.

### P18 — Launch Gate V1

Consolida todas as evidências e decide o lançamento V1. O gate referencia o SHA
exato, Quality, Isolated QA quando exigido, UAT, Production Audit, backup, rollback,
smoke, P0 e P1.

## 5. Dependências e limites entre prompts

- Um prompt não começa antes da revisão e autorização explícita posteriores ao
  handoff da etapa anterior.
- Descobertas fora de escopo são registradas como P0, P1, P2 ou como planejadas para
  outro prompt; não são corrigidas oportunisticamente.
- Um achado classificado como P0 deve ser destacado imediatamente e não pode ser
  ocultado por uma classificação futura genérica.
- Código, contratos e fluxos já corretos são itens de preservação obrigatória nas
  refatorações seguintes.
- Branches e PRs históricos são fontes a auditar, não instruções para merge
  automático.
- Migrations existentes não são reescritas. Uma mudança autorizada é adicionada de
  forma forward-only e auditável.
- Preview não se torna uma exceção de segurança em nenhum prompt.
- P14 a P18 exigem evidência atual dos ambientes; nenhum desses prompts pode confiar
  apenas no handoff anterior para afirmar o estado de Production.

## 6. Validação e evidência

Cada etapa deve executar validação proporcional ao que foi alterado e registrar:

- comandos ou workflows executados;
- resultado de formatação, lint, typecheck, testes e build quando aplicáveis;
- Quality e Isolated QA, ou justificativa objetiva de não aplicabilidade;
- UAT, quando fizer parte do escopo;
- arquivos alterados;
- migrations, dados, secrets e ambientes tocados ou explicitamente não tocados;
- branch, base `main`, PR e SHA candidato exatos;
- P0, P1, P2 e pendências reais.

Uma mudança somente documental deve validar Markdown e formatação pela configuração
do repositório. Ela não exige Isolated QA se nenhum código ou contrato funcional for
alterado. O workflow Quality deve ser aguardado e registrado quando for disparado.

## 7. Contrato de handoff

Todo prompt termina com um handoff autossuficiente para revisão externa. No mínimo,
ele deve conter:

- prompt concluído;
- repositório;
- branch trabalhada;
- SHA candidato;
- base `main` inspecionada;
- o que foi implementado;
- arquivos principais;
- contratos e regras preservados;
- resultado de Quality;
- resultado ou justificativa de Isolated QA;
- resultado ou justificativa de UAT;
- P0, P1 e P2;
- estado de Production;
- pendências reais; e
- próximo prompt autorizado pela sequência.

O handoff informa fatos observados e links ou evidências quando disponíveis. Ele não
transforma uma pendência em concluída, não presume merge e não inicia o prompt
seguinte.

Modelo documental:

```text
HANDOFF — ULTIMATE RIVALS ATHLETE APP

PROMPT CONCLUÍDO:
[PXX — título]

REPOSITÓRIO:
ultimaterivals/ultimate-rivals-app

BRANCH:
[branch]

SHA CANDIDATO:
[sha exato]

BASE MAIN:
[sha exato]

O QUE FOI IMPLEMENTADO:
- ...

ARQUIVOS PRINCIPAIS:
- ...

CONTRATOS/REGRAS PRESERVADOS:
- ...

QUALITY:
[status e evidência]

ISOLATED QA:
[status ou not required com justificativa]

UAT:
[status ou not required com justificativa]

P0:
[itens]

P1:
[itens]

P2:
[itens]

PRODUCTION:
[tocada ou não tocada]

PENDÊNCIAS REAIS:
- ...

PRÓXIMO PROMPT:
[PXX — título]
```

## 8. Regra de continuidade

A conclusão de um prompt encerra a execução corrente. O próximo prompt só começa
após revisão externa e nova autorização. Em particular, a conclusão do P00 não
autoriza iniciar o P01 na mesma execução.
