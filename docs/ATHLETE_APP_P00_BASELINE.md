# Athlete App — Baseline P00

- **Snapshot:** 2026-08-28
- **Repositório:** `ultimaterivals/ultimate-rivals-app`
- **Prompt:** `P00 — Bootstrap documental e baseline`
- **Branch de trabalho:** `docs/athlete-app-p00-baseline`
- **Base `main`:** `77d32b0bffb415ddc5aec66ba4856eaedefd6d67`

## Escopo e fonte de verdade

Os artefatos com os nomes `UR_ATHLETE_APP_DOCUMENTO_MESTRE_V3_2026-08-28` e `UR_ATHLETE_APP_PROMPTS_CODEX_CONCLUSAO_V1_2026-08-28` não foram encontrados no repositório, nas branches auditadas nem entre os arquivos locais fornecidos. Após esse bloqueio ser reportado, o usuário reiterou integralmente o prompt de abertura, os 36 princípios aprovados, as jornadas, a navegação, o escopo do P00, a sequência P00–P18 e os gates de release.

Para concluir o bootstrap sem reconstruir arquitetura nem inventar regras, esse texto reiterado foi adotado como autoridade documental fornecida pelo usuário em 2026-08-28. Onde ele define somente um gate — por exemplo, backup, rollback e smoke — a documentação registra a exigência e reserva o procedimento detalhado para o runbook aprovado das fases correspondentes.

Este baseline é uma fotografia auditável. Ele não corrige as divergências encontradas e não substitui evidência atualizada nas fases futuras.

## Estado operacional observado

| Item                         | Estado no snapshot                                                                                                                     |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `main`                       | `77d32b0bffb415ddc5aec66ba4856eaedefd6d67`                                                                                             |
| Branch P00                   | `docs/athlete-app-p00-baseline`, criada a partir da `main` acima                                                                       |
| Worktree antes do P00        | Limpa; nenhuma alteração local não relacionada foi identificada                                                                        |
| Branch relevante             | `launch/logo-hunter-real-data` em `77f2c78e9831ff95d25981e19ddd259eac83daa7`, 13 commits à frente da base                              |
| PR relevante                 | `#73`, aberto e mergeable no snapshot; não está pronto para merge                                                                      |
| Último `Quality` de `main`   | Run `#772` (`33092809572`), sucesso, no SHA base                                                                                       |
| Último `Isolated QA` de main | Run `#286` (`33092809667`), sucesso, no SHA base                                                                                       |
| `Quality` do PR `#73`        | Run `#782`, falhou no format de `src/app/athlete/hunter/page.tsx`                                                                      |
| Preview do PR `#73`          | Deployment `dpl_9apRFP4zHzesy1R8TEBjj2YA3KvK`; falhou no build TypeScript em `athlete-shell.tsx` (`exact`/`special` em união de tipos) |
| Production conhecida         | Deployment `dpl_8ByKS2WHdWSt78QPwpjqumacPwpb`, `READY`, criado em `2026-08-27T16:21:40.204Z` e ligado à `main`/SHA base                |
| Production tocada pelo P00   | **NÃO**; apenas inspeções read-only foram realizadas                                                                                   |
| PR do próprio P00            | Deve ser registrado no handoff após commit e abertura; este arquivo não antecipa o número                                              |

O sucesso histórico de workflows ou de Production não aprova automaticamente o SHA candidato do P00. O workflow `Quality` precisa ser observado novamente após a abertura do PR documental.

## Relação com branches e PRs não mergeados

| PR    | Leitura do snapshot                                                                                      | Orientação de preservação                                                                                                           |
| ----- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `#73` | `launch/logo-hunter-real-data`; seis arquivos, 13 commits à frente, Quality e Preview vermelhos.         | Preservar seletivamente logo oficial, navegação mobile aprovada, rota Hunter dedicada e agrupamento desktop; não mergear como está. |
| `#66` | Branch histórica, 68 commits atrás e 3 à frente, com conflito; implementação foi superada na `main`.     | Preservar apenas invariantes: histórico escopado, datas desconhecidas nulas e ausência de efeito automático em ranking/UR Coins.    |
| `#65` | Trabalho de Isolated QA já superado pela cobertura presente na `main`.                                   | Não reintroduzir código antigo; preservar a intenção de isolamento e evidência de QA.                                               |
| `#61` | Escopo de Command Center, fora da implementação documental do Athlete App.                               | Manter como backlog do produto correto; não misturar a experiência Command com Athlete App.                                         |
| `#64` | Escopo de Command Center, fora da implementação documental do Athlete App.                               | Manter como backlog do produto correto; não misturar a experiência Command com Athlete App.                                         |
| `#19` | Branch antiga e conflitante, com conceitos de integração Command/App e contratos compartilhados.         | Preservar separação de produtos e compartilhamento de backend/entidades/RPCs/ledgers; não fazer merge integral.                     |
| `#6`  | Branch antiga e conflitante, com conceitos de mundo, arenas, mídia e privacidade.                        | Preservar conceitos válidos já integrados; não substituir a implementação atual por código obsoleto.                                |
| `#5`  | Branch antiga e conflitante, associada à segurança de Preview.                                           | Preservar Preview read-only, sem impersonation e sem bypass de RLS; não fazer merge integral.                                       |
| `#3`  | Branch antiga e conflitante, com intenção de marca oficial e mecanismo de credencial de desenvolvimento. | Preservar somente a intenção da marca oficial; não reintroduzir seletor de credenciais ou fluxo inseguro.                           |

Nenhuma dessas mudanças foi mergeada, descartada ou alterada pelo P00. Refatorações futuras devem comparar o código vigente com os comportamentos preserváveis antes de remover qualquer implementação válida.

## Migrations — inventário read-only

| Origem      | Quantidade | Head observado                                           |
| ----------- | ---------- | -------------------------------------------------------- |
| Repositório | 90         | `20260827162500_fix_team_roster_parameter_ambiguity.sql` |
| Production  | 91         | `20260827183949_fix_team_roster_parameter_ambiguity`     |

### Presentes somente no repositório

- `restrict_ur_coin_direct_client_writes`
- `add_historical_ranking_event_helper`
- `fix_competition_formation_ranking_aggregation`
- `admin_create_team`
- `restrict_admin_create_team_anon`

### Presentes somente em Production

- `allow_ur_play_confirmation_to_finalize_venue`
- `ur_play_incidents_safety`
- `guard_incidents_after_360_close`
- `add_private_historical_ranking_event_helper`
- `fix_competition_formation_ranking_member_multiplication`
- `admin_create_team_function`

Além das diferenças nominais, 52 migrations com nomes correspondentes possuem timestamps de versão diferentes entre o repositório e Production. Nomes semelhantes não foram tratados como prova de equivalência. A reconciliação deve ocorrer em `P14 — Reconciliação de dados reais` e ser confirmada em `P17 — Auditoria Production + Deploy`, sem editar migrations existentes, aplicar migration ou alterar dados nesta etapa.

## Matriz de conformidade

As classificações descrevem o código observado na base. `Prompt responsável` indica a fase correta para preservar, completar ou corrigir o item; nada abaixo foi corrigido no P00.

| Área                         | Estado atual                                                                                                                | Documento Mestre                                                                                                    | Classificação                  | Prompt responsável        |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------- |
| Shell                        | `AthleteShell` dedicado existe; mobile ainda aponta o quinto destino para Temporada e o desktop usa sidebar extensa.        | Preservar `AthleteShell`; mobile com Início, Jogar, Ranking, Hunter e Perfil; desktop como adaptação.               | `DIVERGENTE P1`                | `P01`                     |
| Home                         | Player Hub usa serviços reais, mas permanece orientado a cards e exibe zeros/estado estável quando a origem é ausente.      | Comunicar carreira e rumo ao estrelato sem preenchimento visual ou progressão fictícia.                             | `DIVERGENTE P0`                | `P02` / `P14`             |
| Jogar                        | Agenda e disponibilidade existem com semânticas distintas, porém a jornada está fragmentada.                                | Jornada única para descobrir, reservar, entrar em waitlist, fazer check-in e participar, sem conflar estados.       | `DIVERGENTE P1`                | `P03`                     |
| Ranking Individual           | Usa leitura oficial de ranking e mantém ordenação/escopo próprios.                                                          | Ranking real e auditável, separado do ledger de UR Coins.                                                           | `CONFORME`                     | `P04` (preservar)         |
| Duplas                       | Ranking/formação parcial existe; a identificação de formação do atleta compara entidades incompatíveis e faltam fluxos.     | Duplas são formações competitivas nativas, temporais e vinculadas à temporada/ciclo.                                | `DIVERGENTE P1`                | `P04` / `P10`             |
| Quartetos                    | Backend reconhece `fours` parcialmente; não há tab de ranking e a formação corrente cobre apenas duplas.                    | Quartetos são formações competitivas nativas, temporais e vinculadas à temporada/ciclo.                             | `DIVERGENTE P1`                | `P10`                     |
| Resultados                   | Resultados atuais/históricos e homologação alimentam o impacto de ranking por transações oficiais.                          | Resultado homologado integra a carreira e só gera efeitos pelos contratos oficiais.                                 | `CONFORME`                     | `P05` (preservar)         |
| Histórico                    | RPC escopada preserva datas nulas e não cria automaticamente ranking ou UR Coins.                                           | Histórico homologado faz parte da carreira; datas desconhecidas não são inventadas.                                 | `CONFORME`                     | `P05` (preservar)         |
| Temporada                    | Serviço inclui título, etapas e fase estáticos que podem ser apresentados como reais quando a fonte falta.                  | Temporada, ciclo, elegibilidade e classificação devem vir de dados reais.                                           | `DIVERGENTE P0`                | `P06` / `P14`             |
| Evolução                     | Mistura Hunter com evolução comum e usa badges/estágios hardcoded e fallbacks numéricos.                                    | Evolução esportiva comum é separada do Hunter e não pode criar progressão fictícia.                                 | `DIVERGENTE P0`                | `P07` / `P14`             |
| Hunter                       | Não há rota dedicada na `main`; conteúdo está embutido em Evolução e o domínio não implementa opt-in completo.              | Área opt-in e Escola de Desenvolvimento UR, paralela e separada da evolução comum.                                  | `DIVERGENTE P0`                | `P08`                     |
| Equipe                       | Leitura temporal, ranking e contribuição existem; caminhos de gestão ainda permitem vínculo direto sem convite + aceite.    | Equipes são eixo central; nenhum vínculo ou transferência pode ser inferido; convite + aceite são obrigatórios.     | `DIVERGENTE P0`                | `P09` / `P10`             |
| Recrutamento                 | Não há superfície/domínio completo de convite e aceite, enquanto inserção direta de membership continua possível.           | Entrada em equipe exige recrutamento explícito por convite + aceite e capacidade real quando aplicável.             | `DIVERGENTE P0`                | `P10`                     |
| Profissionalização da equipe | Trilha de profissionalização não está implementada como experiência do atleta/equipe.                                       | Trilha permanente com crescimento, ranking, mídia, benefícios, oportunidades e repasses.                            | `PLANEJADO PARA PROMPT FUTURO` | `P09`                     |
| Oportunidades                | Agenda expõe estados reais de jogo/treino/evento; escopo é parcial e capacidade nula pode aparecer como zero.               | Oportunidades reais e vigentes devem ser visíveis, sem fabricar disponibilidade ou escassez.                        | `DIVERGENTE P0`                | `P11` / `P14`             |
| Premiações                   | Entidades/serviços existem no backend, mas não há superfície completa no Athlete App.                                       | Premiações reais e vigentes devem ganhar visibilidade.                                                              | `PLANEJADO PARA PROMPT FUTURO` | `P11`                     |
| Repasses                     | Entidades/serviços existem no backend, mas não há superfície completa no Athlete App.                                       | Repasses reais e vigentes devem ganhar visibilidade e permanecer auditáveis.                                        | `PLANEJADO PARA PROMPT FUTURO` | `P11`                     |
| Wallet                       | Ledgers permanecem separados, mas saldo ausente vira zero e falta timeline completa do ledger.                              | Wallet deriva de UR Coins reais, separada de Ranking Points e sem fallback enganoso.                                | `DIVERGENTE P0`                | `P13` / `P14`             |
| Market                       | Ofertas vigentes e resgate atômico/idempotente existem; saldo ausente vira zero e influencia a apresentação.                | Market mostra ofertas reais e benefícios vigentes; resgates são auditáveis e Preview não escreve.                   | `DIVERGENTE P0`                | `P13` / `P14`             |
| Perfil                       | Identidade, equipe e readiness usam dados explícitos; disponibilidade não é tratada como reserva e Preview bloqueia edição. | Perfil esportivo real, sem inferir vínculo/elegibilidade e sem permitir escrita no Preview.                         | `CONFORME`                     | `P12` (preservar)         |
| Mídia                        | Superfície lê apenas mídia publicável/pública e não expõe registros privados.                                               | Reconhecimento e mídia reais, vigentes e compatíveis com privacidade.                                               | `CONFORME`                     | `P12` (preservar)         |
| Notificações                 | Há base backend, mas não existe inbox completo no Athlete App.                                                              | Notificações relevantes à jornada devem ser integradas à experiência esportiva.                                     | `PLANEJADO PARA PROMPT FUTURO` | `P12`                     |
| Onboarding                   | Claim token e primeiro acesso são seguros; onboarding esportivo completo ainda não existe.                                  | Entrada no produto deve orientar a jornada esportiva sem credenciais inseguras ou dados inventados.                 | `PLANEJADO PARA PROMPT FUTURO` | `P12`                     |
| Preview                      | Cookie administrativo é tratado no servidor, não troca identidade, bloqueia mutações e possui testes read-only.             | Preview administrativo somente leitura, sem impersonation e sem bypass de RLS.                                      | `CONFORME`                     | `P01` / `P16` (preservar) |
| Mobile                       | Bottom navigation e safe area existem; o quinto destino atual não é Hunter.                                                 | Mobile é referência e possui exatamente Início, Jogar, Ranking, Hunter e Perfil como base.                          | `DIVERGENTE P1`                | `P01`                     |
| Desktop                      | Layout responsivo existe, mas a sidebar extensa ainda cria leitura de portal administrativo.                                | Desktop é adaptação funcional da experiência mobile e pode agrupar Carreira/Ecossistema sem comandar a arquitetura. | `DIVERGENTE P1`                | `P01`                     |

## O que já está bom e precisa ser preservado

- Separação de rotas e shells entre Command Center e Athlete App.
- `AthleteShell` como base da experiência do atleta.
- Preview server-side e somente leitura, sem troca de identidade, impersonation ou bypass de RLS.
- Semânticas distintas de interesse, reserva, waitlist, check-in, participação e disponibilidade.
- Operações transacionais da agenda e barreiras de mutação no Preview.
- Ranking público/oficial e ledger de Ranking Points separado de UR Coins.
- Base canônica de duplas, equipes, memberships e rosters temporais.
- Histórico homologado escopado, com datas desconhecidas preservadas como nulas e sem efeitos automáticos indevidos.
- Resultados homologados conectados a impactos auditáveis por transações.
- Separação entre créditos operacionais, UR Coins e Ranking Points.
- Ofertas reais e vigentes no Market, com resgate atômico/idempotente por RPC.
- Exclusão de mídia privada das superfícies publicáveis.
- Claim token e primeiro acesso sem mecanismo inseguro de escolha de credencial.
- Sinais de saúde de fonte de dados que permitem distinguir ausência, erro e conteúdo real.
- Cobertura E2E já existente para fluxos críticos e Preview.
- Logo e demais assets oficiais já versionados; refatorações não devem substituí-los por marca inventada.

## Divergências por prioridade

### P0 — não corrigidos nesta etapa

- Home converte ausência de movimento/dados em “posição estável” ou zero visível.
- Temporada apresenta fallback estático de título, fases e etapas como contexto real.
- Evolução mistura Hunter, badges/estágios hardcoded e métricas ausentes convertidas em zero.
- Hunter não é uma área dedicada/opt-in completa na `main`.
- Gestão/recrutamento de equipe ainda permite vínculo direto, contrariando convite + aceite.
- Oportunidades têm cobertura parcial e capacidade ausente pode aparecer como zero.
- Wallet e Market convertem saldo ausente em zero, influenciando leitura e elegibilidade visual.

### P1 — não corrigidos nesta etapa

- Shell mobile usa Temporada em vez de Hunter como quinto destino.
- Desktop ainda se aproxima de um portal administrativo com sidebar extensa.
- Home permanece excessivamente orientada a cards.
- Jornada de Jogar está fragmentada apesar de preservar estados distintos.
- Duplas têm identificação incompleta/incorreta da formação do atleta.
- Quartetos não possuem experiência nativa completa no ranking e nas formações correntes.

### P2 — não corrigidos nesta etapa

- Copy legado “Portal do Atleta” ainda aparece no fluxo de claim/primeiro acesso.
- Testes mobile codificam a navegação anterior e precisarão acompanhar a arquitetura aprovada quando P01 for executado.

Itens classificados como `PLANEJADO PARA PROMPT FUTURO` não são tratados como falha isolada do P00: profissionalização da equipe, premiações, repasses, notificações e onboarding esportivo pertencem explicitamente aos prompts indicados, mas continuam obrigatórios para conclusão.

## Guardrails para os próximos prompts

1. Não reconstruir o projeto nem substituir contratos canônicos por engines paralelas.
2. Não apagar comportamento válido só porque a UX futura é diferente.
3. Revisar seletivamente o PR `#73`; não mergeá-lo enquanto Quality, build e semântica de dados estiverem divergentes.
4. Tratar a diferença de migrations como reconciliação auditável, nunca como autorização para editar histórico ou aplicar mudanças nesta fase.
5. Não usar direct write corretivo para ranking, UR Coins, resultados, elegibilidade, equipe ou repasse.
6. Revalidar SHA, branches, PRs, workflows, migrations e Production no início de cada fase; este snapshot não deve ser presumido atual.
7. Manter Production sem alteração até a etapa explicitamente autorizada.

## Resultado do P00 sobre sistemas

- Código funcional: não alterado.
- Migrations: não alteradas nem aplicadas.
- Supabase Production: não alterado.
- Dados reais: não alterados.
- Secrets: não alterados.
- Deploy: não executado manualmente.
- Isolated QA: não requerido para uma mudança exclusivamente documental.
