# Arquitetura

Ranking usa `ranking_transactions` append-only como fonte privada e uma projeção relacional sanitizada/reconstruível para leituras frequentes sem N+1. Processamentos atualizam temporada e ciclos; snapshots são append-only. Views `security_invoker` expõem a projeção, nunca o ledger.

Scoring segue UI → Server Action → service → repository/RPC. Rallies são a fonte de verdade; views `security_invoker` derivam placar, game point, sequências e estatísticas. RPCs transacionais concentram lock, idempotência, revisão e homologação.

UR Play usa Server Actions, services e repositories. Capacidade, promoção, check-in e walk-in ficam em RPCs transacionais PostgreSQL; RLS é a fronteira de autorização.

Court Ops mantém sugestões puras no service e confirmações em RPC transacional. Índice parcial protege quadras e locks da fila protegem atletas sob concorrência.

Progressão usa RPCs `security invoker` para state machine e transações de nível. Critérios são dados configuráveis, não constantes de UI, e os scores estruturados permanecem separados das avaliações.

O domínio de equipes segue UI → server actions → services → repositories/Supabase. Regras críticas também vivem em constraints e triggers Postgres. A troca de polo usa RPC `security invoker` transacional; helpers privilegiados ficam no schema `private`, têm `search_path` vazio e grants mínimos.

Atleta 360 mantém regras em validações, services e repositories. React coordena apresentação; busca, filtros e paginação executam no servidor, sem enviar PII desnecessária ao client.

## Visão

Monólito modular Next.js com App Router. Componentes visuais ficam em `components`; casos de uso em `server/services`; acesso a dados em `server/repositories`; contratos de cada contexto em `features`. Componentes React não consultam o banco diretamente.

## Camadas

1. `app`: rotas, layouts, Route Handlers e composição.
2. `features`: contratos e UI por capacidade.
3. `server/services`: casos de uso e transações.
4. `server/repositories`: persistência Supabase/PostgreSQL.
5. `lib`: infraestrutura compartilhada, autenticação, validação e clientes.

O navegador usa `createBrowserClient`; Server Components e actions usam `createServerClient`. `src/proxy.ts` renova cookies de sessão. No Next.js 16, Proxy é o nome atual do antigo Middleware.

## Persistência e domínio

Migrations pequenas em `supabase/migrations` definem identidade, estruturas esportivas, vínculos temporais, formações, auditoria, RLS, índices e grants. Repositories encapsulam Supabase; services validam comandos, autorização e invariantes de aplicação. Server Actions apenas adaptam formulário → service.

`profiles.role` é a fonte de verdade. `access_assignments` dá escopo temporal a gestores de polo/equipe. O frontend nunca é autoridade; layouts, actions, services e RLS validam acesso no servidor/banco.

Auditoria crítica usa triggers para não depender de um caminho específico de aplicação. Logs são append-only para roles comuns.

## Offline

A operação de quadra será preparada com fila local, identificadores idempotentes, estados de sincronização e resolução explícita de conflitos. O service worker de dados não será criado antes dessas regras.

## Observabilidade

`/api/health` é apenas um liveness check. Logs estruturados, tracing e métricas entram com os primeiros serviços de domínio.

# Sprint 9 — mérito e pontuação

O domínio de pontuação usa `ranking_transactions` como ledger append-only. A homologação de resultado e o processamento acontecem atomicamente no PostgreSQL; serviços Next.js apenas invocam a operação autorizada e apresentam projeções `security_invoker`. Regras são dados versionados e snapshots históricos impedem que uma troca posterior de equipe altere contribuições passadas.
