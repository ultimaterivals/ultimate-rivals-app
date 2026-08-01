# Plano — Sprint 2

1. Documentar domínio, governança, temporalidade e RLS.
2. Criar migrations pequenas para tipos, entidades, vínculos, auditoria, RLS e índices.
3. Criar seed separado e explicitamente fictício.
4. Implementar validações Zod, repositories e services sem queries em React.
5. Consolidar autorização server-side com `profiles.role` como fonte de verdade.
6. Entregar CRUD administrativo mínimo e perfil read-only do atleta.
7. Testar unidade, browser, build e, se Docker existir, reset/RLS local.
8. Auditar privilege escalation, IDOR, mass assignment, escopo e tampering.

## Fora de escopo

UR Play, partidas, placar, estatísticas, progressão, pontuação, ranking, moedas, torneios, Regional, Legends e repasses.

## Critérios técnicos

RLS em toda tabela exposta; deny-by-default; logs append-only; migrations reproduzíveis; sem credenciais reais; branch isolada e sem merge em `main`.
