# Arquitetura

## Visão

Monólito modular Next.js com App Router. Componentes visuais ficam em `components`; casos de uso em `server/services`; acesso a dados em `server/repositories`; contratos de cada contexto em `features`. Componentes React não consultam o banco diretamente.

## Camadas

1. `app`: rotas, layouts, Route Handlers e composição.
2. `features`: contratos e UI por capacidade.
3. `server/services`: casos de uso e transações.
4. `server/repositories`: persistência Supabase/PostgreSQL.
5. `lib`: infraestrutura compartilhada, autenticação, validação e clientes.

O navegador usa `createBrowserClient`; Server Components e actions usam `createServerClient`. `src/proxy.ts` renova cookies de sessão. No Next.js 16, Proxy é o nome atual do antigo Middleware.

## Offline

A operação de quadra será preparada com fila local, identificadores idempotentes, estados de sincronização e resolução explícita de conflitos. O service worker de dados não será criado antes dessas regras.

## Observabilidade

`/api/health` é apenas um liveness check. Logs estruturados, tracing e métricas entram com os primeiros serviços de domínio.
