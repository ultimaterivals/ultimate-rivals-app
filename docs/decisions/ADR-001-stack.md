# ADR-001: Stack da fundação

- Status: aceito
- Data: 2026-08-01

## Decisão

Usar Next.js App Router, React, TypeScript strict, Tailwind CSS, Supabase/PostgreSQL, Zod, React Hook Form, TanStack Query, Vitest e Playwright.

## Razões

Server Components reduzem exposição de lógica sensível; Supabase fornece Auth e PostgreSQL; Zod mantém validação nas fronteiras; TanStack Query prepara estado remoto no cliente; Vitest e Playwright cobrem unidade e fluxos.

## Consequências

Node 22+ é obrigatório para os clientes Supabase atuais. O sistema depende de disciplina de RLS, migrações e fronteiras servidor/cliente. A estratégia offline exigirá um ADR próprio antes de persistir operações mutáveis.
