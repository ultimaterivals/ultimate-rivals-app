# Ultimate Rivals — Fundação técnica

Base do aplicativo oficial do Ultimate Rivals. Este ciclo entrega infraestrutura, autenticação, papéis, portais vazios e design system; não implementa regras esportivas, pontuação ou dados reais.

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

## Rotas iniciais

- `/`: página pública temporária
- `/login`: autenticação
- `/admin`: admin, operator, pole_manager e team_manager
- `/athlete`: athlete
- `/api/health`: diagnóstico básico

Os papéis devem ser gravados por processo administrativo seguro em `app_metadata.role`. Consulte [docs/security.md](docs/security.md).

## PWA e offline

O manifesto e os tokens responsivos estão configurados. Cache offline mutável e sincronização de operação de quadra serão adicionados somente após definir conflitos, idempotência e regras de homologação.

## Documentação

Arquitetura, domínio, segurança, fluxo de desenvolvimento e a decisão de stack estão em `docs/`.
