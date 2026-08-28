# Athlete App — Baseline P00

- **Snapshot:** 2026-08-28
- **Repositório:** `ultimaterivals/ultimate-rivals-app`
- **Prompt:** `P00 — Bootstrap documental e baseline`
- **Branch de trabalho:** `docs/athlete-app-p00-baseline`
- **Base `main`:** `77d32b0bffb415ddc5aec66ba4856eaedefd6d67`

## Escopo e fonte de verdade

Os dois artefatos obrigatórios foram disponibilizados nesta conversa e lidos integralmente antes desta reconciliação:

| Autoridade          | Arquivo recebido                                              | SHA-256                                                            | Leitura estrutural                                           | Renderização de conferência |
| ------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------ | --------------------------- |
| Documento Mestre V3 | `1-UR_ATHLETE_APP_DOCUMENTO_MESTRE_V3_2026-08-28.docx`        | `39983AAF61F0D87FE1D916289CCD7B61305766FCB5C25C3A77113364F3D3B0E1` | 761 blocos; 727 parágrafos; 34 tabelas; 188 linhas de tabela | 27 páginas                  |
| Plano de Prompts V1 | `2-UR_ATHLETE_APP_PROMPTS_CODEX_CONCLUSAO_V1_2026-08-28.docx` | `E71F3B7D51DCD24A8082042D116232AFC5B8009E63257E3A775C5C0E0BC464B5` | 144 blocos; 119 parágrafos; 25 tabelas; 52 linhas de tabela  | 40 páginas                  |

`docs/ATHLETE_APP_MASTER.md` é a transcrição integral versionada do Documento Mestre e passa a ser a fonte de verdade da arquitetura do Athlete App no repositório. `docs/ATHLETE_APP_CODEX_PROMPTS.md` é a transcrição integral versionada do plano oficial P00–P18. O prompt de abertura fornecido pelo usuário complementa o registro formal com ADR-ATH-013 a ADR-ATH-015 e com os gates explícitos exigidos para o Release Checklist; esses itens também são coerentes com as seções temáticas do Documento Mestre.

A validação automática de cobertura encontrou `1110/1110` segmentos do Documento Mestre e `1713/1713` segmentos do Plano de Prompts nas transcrições Markdown. A conferência visual por renderização do Word cobriu capa, páginas intermediárias com tabelas/callouts e página final de ambos os documentos.

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
| PR do próprio P00            | `#74`, aberto na branch documental; o SHA final e o run de Quality desta reconciliação são registrados no handoff                      |

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

Os 13 commits, gates, evidências por arquivo, itens preserváveis e correções mapeadas a P01/P07/P08/P14/P16 estão em [`ATHLETE_APP_P00_PR73_ANALYSIS.md`](ATHLETE_APP_P00_PR73_ANALYSIS.md). O PR `#73` não deve ser mergeado enquanto Quality/Preview estiverem vermelhos e as inferências de Hunter/dados ausentes não forem corrigidas nos prompts responsáveis.

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

Além das diferenças nominais, 52 migrations com nomes correspondentes possuem timestamps de versão diferentes. A perícia de conteúdo encontrou 40 SQLs normalizados idênticos e 12 textualmente diferentes nesse grupo. Não há uma “91ª migration” única: o `+1` é o saldo de seis nomes só Production contra cinco só repo, com renomes e empacotamentos diferentes.

Três riscos materiais ficaram comprovados: migrations de incidentes aplicadas em Production nunca foram versionadas no Git; a hardening local contra direct-write de UR Coins não está efetiva em Production; e o helper histórico local omite o revoke de `PUBLIC` observado em Production. Eles são P0 de release. A análise completa, os 52 pares de versão e a aritmética exata estão em [`ATHLETE_APP_P00_MIGRATION_DRIFT.md`](ATHLETE_APP_P00_MIGRATION_DRIFT.md). A reconciliação pertence ao `P14`; `P15` permanece bloqueado até resolver os P0; `P17` confirma Production. Nada foi corrigido ou aplicado neste P00.

## Matriz de conformidade

As classificações descrevem o código observado na base. `Prompt responsável` indica a fase correta para preservar, completar ou corrigir o item; nada abaixo foi corrigido no P00.

A matriz ampliada, com evidências de código, segurança/RLS, migrations, estados funcionais, PWA/offline, acessibilidade, performance, analytics, conteúdo, dados de lançamento, QA e release, está em [`ATHLETE_APP_P00_COMPLIANCE_MATRIX.md`](ATHLETE_APP_P00_COMPLIANCE_MATRIX.md). A tabela abaixo mantém as 26 áreas mínimas exigidas pelo P00.

| Área                         | Estado atual                                                                                                               | Documento Mestre                                                                                                    | Classificação                  | Prompt responsável        |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------- |
| Shell                        | `AthleteShell` dedicado existe; mobile ainda aponta o quinto destino para Temporada e o desktop usa sidebar extensa.       | Preservar `AthleteShell`; mobile com Início, Jogar, Ranking, Hunter e Perfil; desktop como adaptação.               | `DIVERGENTE P1`                | `P01`                     |
| Home                         | Player Hub usa serviços reais, mas permanece orientado a cards e exibe zeros/estado estável quando a origem é ausente.     | Comunicar carreira e rumo ao estrelato sem preenchimento visual ou progressão fictícia.                             | `DIVERGENTE P1`                | `P02` / `P14`             |
| Jogar                        | Agenda e disponibilidade existem com semânticas distintas, porém a integração da jornada ainda não foi executada.          | Jornada única para descobrir, reservar, entrar em waitlist, fazer check-in e participar, sem conflar estados.       | `PLANEJADO PARA PROMPT FUTURO` | `P03`                     |
| Ranking Individual           | Usa ranking canônico, filtros, pódio e classificação; faltam rival abaixo e explicabilidade completa.                      | Ranking real, auditável, compreensível e separado do ledger de UR Coins.                                            | `PLANEJADO PARA PROMPT FUTURO` | `P04`                     |
| Duplas                       | Ranking/formação parcial existe; a identificação de formação do atleta compara entidades incompatíveis e faltam fluxos.    | Duplas são formações competitivas nativas, temporais e vinculadas à temporada/ciclo.                                | `DIVERGENTE P1`                | `P04` / `P10`             |
| Quartetos                    | Backend reconhece `fours` parcialmente; não há tab de ranking e a formação corrente cobre apenas duplas.                   | Quartetos são formações competitivas nativas, temporais e vinculadas à temporada/ciclo.                             | `PLANEJADO PARA PROMPT FUTURO` | `P04` / `P10`             |
| Resultados                   | Resultados atuais/históricos e homologação alimentam o impacto de ranking por transações oficiais.                         | Resultado homologado integra a carreira e só gera efeitos pelos contratos oficiais.                                 | `CONFORME`                     | `P05` (preservar)         |
| Histórico                    | RPC escopada preserva datas nulas e não cria automaticamente ranking ou UR Coins.                                          | Histórico homologado faz parte da carreira; datas desconhecidas não são inventadas.                                 | `CONFORME`                     | `P05` (preservar)         |
| Temporada                    | Serviço inclui título, etapas e fase estáticos que podem ser apresentados como reais quando a fonte falta.                 | Temporada, ciclo, elegibilidade e classificação devem vir de dados reais.                                           | `DIVERGENTE P1`                | `P06` / `P14`             |
| Evolução                     | Mistura Hunter com evolução comum e usa badges/estágios hardcoded e fallbacks numéricos.                                   | Evolução esportiva comum é separada do Hunter e não pode criar progressão fictícia.                                 | `DIVERGENTE P1`                | `P07` / `P14`             |
| Hunter                       | Não há rota dedicada na `main`; conteúdo está embutido em Evolução e o domínio não implementa opt-in completo.             | Área opt-in e Escola de Desenvolvimento UR, paralela e separada da evolução comum.                                  | `DIVERGENTE P1`                | `P08`                     |
| Equipe                       | Leitura temporal, ranking e contribuição existem; caminhos de gestão ainda permitem vínculo direto sem convite + aceite.   | Equipes são eixo central; nenhum vínculo ou transferência pode ser inferido; convite + aceite são obrigatórios.     | `DIVERGENTE P0`                | `P09` / `P10`             |
| Recrutamento                 | Não há superfície/domínio completo de convite e aceite, enquanto inserção direta de membership continua possível.          | Entrada em equipe exige recrutamento explícito por convite + aceite e capacidade real quando aplicável.             | `DIVERGENTE P0`                | `P10`                     |
| Profissionalização da equipe | Trilha de profissionalização não está implementada como experiência do atleta/equipe.                                      | Trilha permanente com crescimento, ranking, mídia, benefícios, oportunidades e repasses.                            | `PLANEJADO PARA PROMPT FUTURO` | `P09`                     |
| Oportunidades                | Agenda expõe estados reais; capacidade nula pode aparecer como zero/lotação e a central multategoria ainda não existe.     | Oportunidades reais e vigentes devem ser visíveis, sem fabricar disponibilidade ou escassez.                        | `DIVERGENTE P1`                | `P03` / `P11` / `P14`     |
| Premiações                   | Entidades/serviços existem no backend, mas não há superfície completa no Athlete App.                                      | Premiações reais e vigentes devem ganhar visibilidade.                                                              | `PLANEJADO PARA PROMPT FUTURO` | `P11`                     |
| Repasses                     | Entidades/serviços existem no backend, mas não há superfície completa no Athlete App.                                      | Repasses reais e vigentes devem ganhar visibilidade e permanecer auditáveis.                                        | `PLANEJADO PARA PROMPT FUTURO` | `P11`                     |
| Wallet                       | Ledgers permanecem separados, mas saldo ausente vira zero e falta timeline completa do ledger.                             | Wallet deriva de UR Coins reais, separada de Ranking Points e sem fallback enganoso.                                | `DIVERGENTE P0`                | `P13` / `P14`             |
| Market                       | Ofertas vigentes e resgate atômico/idempotente existem; saldo ausente vira zero e influencia a apresentação.               | Market mostra ofertas reais e benefícios vigentes; resgates são auditáveis e Preview não escreve.                   | `DIVERGENTE P0`                | `P13` / `P14`             |
| Perfil                       | Identidade/readiness são reais; fonte de equipes indisponível pode virar “Atleta livre” e vínculos viram “Equipe Oficial”. | Perfil esportivo real, sem inferir vínculo/elegibilidade e sem permitir escrita no Preview.                         | `DIVERGENTE P1`                | `P12` / `P14`             |
| Mídia                        | Superfície lê apenas mídia publicável/pública e não expõe registros privados.                                              | Reconhecimento e mídia reais, vigentes e compatíveis com privacidade.                                               | `CONFORME`                     | `P12` (preservar)         |
| Notificações                 | Há base backend, mas não existe inbox completo no Athlete App.                                                             | Notificações relevantes à jornada devem ser integradas à experiência esportiva.                                     | `PLANEJADO PARA PROMPT FUTURO` | `P12`                     |
| Onboarding                   | Claim token e primeiro acesso são seguros; onboarding esportivo completo ainda não existe.                                 | Entrada no produto deve orientar a jornada esportiva sem credenciais inseguras ou dados inventados.                 | `PLANEJADO PARA PROMPT FUTURO` | `P12`                     |
| Preview                      | Cookie administrativo é tratado no servidor, não troca identidade, bloqueia mutações e possui testes read-only.            | Preview administrativo somente leitura, sem impersonation e sem bypass de RLS.                                      | `CONFORME`                     | `P01` / `P16` (preservar) |
| Mobile                       | Bottom navigation e safe area existem; o quinto destino atual não é Hunter.                                                | Mobile é referência e possui exatamente Início, Jogar, Ranking, Hunter e Perfil como base.                          | `DIVERGENTE P1`                | `P01`                     |
| Desktop                      | Layout responsivo existe, mas a sidebar extensa ainda cria leitura de portal administrativo.                               | Desktop é adaptação funcional da experiência mobile e pode agrupar Carreira/Ecossistema sem comandar a arquitetura. | `DIVERGENTE P1`                | `P01`                     |

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

- Gestão/recrutamento de equipe cria membership direto ao ligar formação a equipe, sem convite + aceite.
- Wallet apresenta saldo zero quando a fonte financeira está indisponível.
- Market reaproveita esse falso zero para habilitar/bloquear resgate.
- Migrations: schema de incidentes existe em Production, mas não é reproduzível pelo repo.
- Migrations: hardening de direct-write de UR Coins existe apenas local e o efeito não está em Production.
- Migrations: helper histórico local omite o revoke observado em Production e pode ficar executável por `PUBLIC` em replay limpo.

### P1 — não corrigidos nesta etapa

- Shell mobile usa Temporada em vez de Hunter como quinto destino.
- Desktop ainda se aproxima de um portal administrativo com sidebar extensa.
- Logo oficial existe, mas a `main` usa o monograma nas superfícies principais.
- Home permanece excessivamente orientada a cards.
- Home converte ausência de movimento/dados em “posição estável” ou zero visível.
- Duplas têm identificação incompleta/incorreta da formação do atleta.
- Temporada apresenta fallback estático como campanha ativa.
- Evolução mistura Hunter, badges/estágios hardcoded e métricas ausentes convertidas em zero.
- Hunter não é uma área dedicada/opt-in na `main`.
- Capacidade desconhecida pode virar zero/lotação em oportunidades.
- Perfil pode inferir “Atleta livre” e “Equipe Oficial” quando a fonte não sustenta a afirmação.
- Copy legado reintroduz “missões” e Hunter genérico sem contrato.
- Histórico de migrations possui 52 nomes com timestamps divergentes e hardening admin sem proveniência individualizada.

### P2 — não corrigidos nesta etapa

Nenhum P2 isolado foi comprovado estaticamente na `main`. No PR `#73`, a densidade de painéis/cards em Evolução e Hunter foi registrada como P2. Polimento e performance medida permanecem nos prompts futuros e não autorizam redesign no P00.

Itens classificados como `PLANEJADO PARA PROMPT FUTURO` não são tratados como falha isolada do P00: integração de Jogar, explicabilidade completa do Ranking, quartetos, profissionalização/página pública da equipe, premiações, repasses, notificações, onboarding, PWA/offline, analytics, performance medida e piloto/release pertencem aos prompts indicados, mas continuam obrigatórios para conclusão.

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
