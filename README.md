# Ultimate Rivals — Fundação técnica

O Scoring Engine registra rallies, deriva o placar até 11, permite ações técnicas opcionais e conduz revisão/homologação com histórico auditável. Consulte `docs/scoring-engine.md`, `docs/rally-model.md` e `docs/match-homologation.md`.

UR Play oferece sessões, inscrições, waitlist, check-in e presença. Consulte `docs/ur-play-domain.md` e `docs/sprint-6-handoff.md`.

Court Ops acrescenta fila, montagem manual/assistida, lados e alocação de quadras. Consulte `docs/court-ops-domain.md` e `docs/sprint-7-handoff.md`.

Temporadas trimestrais, nivelamento, avaliações e progressão estão disponíveis em `/admin/seasons`, `/admin/leveling`, `/admin/assessments` e `/athlete/development`.

Os módulos Atleta 360 e Equipes oferecem gestão esportiva em `/admin/athletes` e `/admin/teams`, portal do gestor em `/team` e perfil mobile-first em `/athlete/profile`. Consulte `docs/team-domain.md`, `docs/team-roster-rules.md` e `docs/team-pole-model.md`.

O módulo Atleta 360 oferece gestão em `/admin/athletes` e perfil mobile-first em `/athlete/profile`. Consulte `docs/athlete-domain.md`, `docs/athlete-privacy.md` e `docs/athlete-import.md`.

Base do aplicativo oficial do Ultimate Rivals. Inclui infraestrutura, identidade, domínio esportivo central, governança, RLS, auditoria e portais iniciais; não implementa partidas, pontuação, ranking ou dados reais.

## Requisitos

- Node.js 22 ou superior
- npm 11 ou superior
- um projeto Supabase para testar autenticação real

## Instalação

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Nunca use uma chave `service_role` no navegador. Sem credenciais, a home e o login renderizam, mas autenticação e portais protegidos não funcionam.

## Scripts

- `npm run dev`: servidor local
- `npm run lint`: ESLint
- `npm run typecheck`: TypeScript strict
- `npm run test`: testes unitários
- `npm run test:e2e`: Playwright
- `npm run build`: build de produção
- `npm run format`: Prettier

## Supabase local

O CLI está fixado nas dependências. Docker Desktop é necessário para executar o stack:

```bash
npx supabase start
npx supabase db reset
npx supabase db advisors
npx supabase migration list --local
```

O reset aplica as migrations ordenadas e `supabase/seed.sql`, que contém apenas fixtures `[DEV]`. Nesta máquina, Docker não estava disponível; consulte `docs/sprint-2-handoff.md`.

## Rotas iniciais

- `/`: página pública temporária
- `/login`: autenticação
- `/admin`: admin, operator, pole_manager e team_manager
- `/admin/athletes`, `/admin/teams`, `/admin/poles`, `/admin/seasons`: cadastros centrais
- `/athlete`: athlete
- `/athlete/profile`: perfil esportivo read-only
- `/api/health`: diagnóstico básico

`profiles.role` é a fonte de verdade dos papéis e só pode ser alterado por processo administrativo seguro. Consulte [docs/security.md](docs/security.md).

## PWA e offline

O manifesto e os tokens responsivos estão configurados. Cache offline mutável e sincronização de operação de quadra serão adicionados somente após definir conflitos, idempotência e regras de homologação.

## Documentação

Arquitetura, domínio, segurança, fluxo de desenvolvimento e a decisão de stack estão em `docs/`.

# Ranking engine (Sprint 9)

Resultados homologados do UR Play alimentam um ledger append-only versionado. O painel administrativo está em `/admin/ranking-engine` e o histórico individual em `/athlete/points`. Consulte `docs/ranking-engine.md` e `docs/ranking-ledger.md`.
