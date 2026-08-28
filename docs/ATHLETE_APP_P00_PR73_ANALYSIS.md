# Athlete App P00 — Auditoria do PR #73

- **PR:** [#73 — Launch: official brand and Hunter methodology](https://github.com/ultimaterivals/ultimate-rivals-app/pull/73)
- **Base:** `main` em `77d32b0bffb415ddc5aec66ba4856eaedefd6d67`
- **Head:** `launch/logo-hunter-real-data` em `77f2c78e9831ff95d25981e19ddd259eac83daa7`
- **Distância:** 13 commits à frente, 0 atrás
- **Diff:** 6 arquivos, 611 adições, 306 remoções
- **Estado:** aberto, não draft, mergeable; **não pronto para merge**
- **Mutação realizada no PR/branch:** nenhuma

## Gates observados

| Gate           | Evidência                                                                                                                                                                                  | Estado        |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| Quality        | [Run #782](https://github.com/ultimaterivals/ultimate-rivals-app/actions/runs/33152161192); `Format check` falhou em `src/app/athlete/hunter/page.tsx`; os jobs dependentes não executaram | `FAILURE`     |
| Vercel Preview | Deployment `dpl_9apRFP4zHzesy1R8TEBjj2YA3KvK`; TypeScript TS2339 em `athlete-shell.tsx:130` (`exact`) e `:185` (`special`)                                                                 | `ERROR`       |
| Isolated QA    | Nenhum run associado ao head                                                                                                                                                               | Não executado |
| Production     | Todos os deploys do PR têm `target: null`; Production continua no SHA da `main`                                                                                                            | Não tocada    |

O PR é mergeable no sentido mecânico, mas os gates vermelhos e as divergências de produto impedem o merge.

## Auditoria commit a commit

| Commit    | Assunto                                                    | Efeito                                                                                    | Decisão de preservação                                                   |
| --------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `406adfd` | `brand: use official Ultimate Rivals logo`                 | `brand-mark.tsx` passa a usar a PNG oficial e remove o monograma                          | Preservar                                                                |
| `12621ce` | `brand: use official logo for app metadata`                | Metadata e Apple icon passam à logo oficial                                               | Preservar                                                                |
| `bc910a8` | `brand: use official logo in PWA manifest`                 | Manifest referencia PNG oficial `320x320` com tipo correto                                | Preservar                                                                |
| `fd09725` | `product: restore official Hunter methodology`             | Introduz os dez pilares Hunter dentro de Evolução                                         | Preservar o conteúdo; não restaurar a localização transitória            |
| `a633b86` | `style: align official brand mark with prettier`           | Formata o BrandMark                                                                       | Preservar como parte do resultado                                        |
| `85d1df1` | `feat: make athlete shell mobile-first and add Hunter tab` | Cinco destinos móveis, Hunter especial e desktop Carreira/Ecossistema; remove menu “Mais” | Preservar conceito em P01; corrigir tipos e alcance móvel                |
| `ddf7b47` | `feat: add dedicated Hunter development academy`           | Cria `/athlete/hunter`, quatro trilhas e dez pilares                                      | Preservar base em P08; corrigir estados, contratos e fallbacks           |
| `afe2674` | `refactor: separate athlete evolution from Hunter academy` | Separa Evolução comum do Hunter                                                           | Preservar em P07; corrigir semântica de nulos                            |
| `1654f00` | `chore: emit prettier output for athlete UX files`         | Altera temporariamente `format:check` para escrever, imprimir e falhar                    | Não preservar como padrão; efeito líquido é revertido no commit seguinte |
| `b19113e` | `chore: restore quality format check`                      | Restaura o script original                                                                | Preservar o estado final                                                 |
| `6e54939` | `style: format athlete evolution page`                     | Formatação                                                                                | Preservar junto do código válido                                         |
| `9bacb16` | `style: format mobile-first athlete shell`                 | Formatação                                                                                | Preservar junto do código válido                                         |
| `77f2c78` | `style: format Hunter academy page`                        | Formatação pretendida                                                                     | Ainda não satisfaz o Prettier do CI; corrigir no prompt responsável      |

## Mudanças alinhadas ao Documento Mestre

- Logo oficial já versionada aplicada ao BrandMark, metadata e manifest.
- `AthleteShell` preservado.
- Navegação mobile na ordem exata: Início, Jogar, Ranking, Hunter e Perfil.
- Desktop organizado por Carreira e Ecossistema.
- Header compacto, safe area e navegação inferior persistente.
- Preview read-only e separação Command/Athlete preservados.
- Hunter em rota própria, opt-in e visível também para não participantes.
- Quatro trilhas e dez pilares oficiais do Hunter.
- Evolução esportiva comum separada visualmente do Hunter.
- Nenhuma alteração de migration, RPC, schema, ledger ou backend.

## Divergências e prompt responsável

| Achado                                     | Evidência                                                                                 | Classificação                  | Prompt                          |
| ------------------------------------------ | ----------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------- |
| Branch não compila                         | `athlete-shell.tsx:130` e `:185`; unions não expõem `exact`/`special` em todos os membros | `DIVERGENTE P0` de gate        | `P01`                           |
| Hunter não passa no format                 | Quality #782                                                                              | `DIVERGENTE P0` de gate        | `P08`                           |
| Plano Hunter inferido por dados comuns     | `hunter/page.tsx:94-100` usa `development.priorities` para declarar plano publicado       | `DIVERGENTE P1`                | `P08` / `P14`                   |
| Qualquer `hunterStatus` implica plano      | Status `Interested`, `Paused` ou outro valor truthy pode renderizar “Plano publicado”     | `DIVERGENTE P1`                | `P08`                           |
| Campo da Evolução usado como Hunter        | `hunter/page.tsx:205-207` usa `goal30Days` como fallback                                  | `DIVERGENTE P1`                | `P07` / `P08` / `P14`           |
| Missão/objetivo sem fonte                  | `hunter/page.tsx:202-207` cria “Jornada em acompanhamento” e “Continue aplicando...”      | `DIVERGENTE P1`                | `P08`                           |
| Interesse Hunter não é canônico            | CTAs apontam ao feedback genérico em vez de criar estado `Interested`                     | `PLANEJADO PARA PROMPT FUTURO` | `P08`                           |
| Ausência vira zero                         | `development/page.tsx:75-87` e `:142` usam `?? 0` para jogos/pontos                       | `DIVERGENTE P1`                | `P07` / `P14`                   |
| Ausência vira estado operacional           | `development/page.tsx:30` usa “Em nivelamento” sem nível real                             | `DIVERGENTE P1`                | `P07` / `P14`                   |
| Rotas secundárias perdem descoberta mobile | Sem “Mais”, Arenas, Resultados, Equipe, Market e Wallet ficam sem entrada móvel evidente  | `DIVERGENTE P1`                | `P01` e prompts das superfícies |
| Nenhum teste acompanha a mudança           | Nenhum arquivo de teste alterado                                                          | Gate pendente                  | `P01` / `P07` / `P08` / `P16`   |
| Evolução/Hunter ainda muito segmentados    | Muitos painéis, bordas e cards                                                            | `DIVERGENTE P2`                | `P01` / `P07` / `P08`           |
| Área participante Hunter incompleta        | Faltam ciclo, conteúdo, atividades, avaliações, mentor, encontros e histórico             | `PLANEJADO PARA PROMPT FUTURO` | `P08`                           |

A remoção do menu móvel antigo é conceitualmente correta: somente cinco destinos devem ser permanentes. A divergência é remover a única porta de entrada para superfícies secundárias antes de absorvê-las em Início, Jogar, Perfil ou fluxos contextuais.

## Handoff de preservação

1. Não descartar nem mergear automaticamente o PR.
2. Reaproveitar os três commits de marca oficial.
3. Levar a estrutura do `AthleteShell` para P01, corrigindo tipos e acesso contextual às rotas secundárias.
4. Levar a Evolução reescrita para P07, substituindo zeros e “Em nivelamento” por estados honestos.
5. Levar a base Hunter para P08, preservando metodologia/trilhas, mas implementando estados canônicos e removendo inferências.
6. Reconciliar campos comuns versus Hunter em P14.
7. Exigir Quality, build, testes e UAT antes de merge.

Esta auditoria foi somente leitura. Nenhum arquivo do PR, branch, deployment ou ambiente foi alterado.
