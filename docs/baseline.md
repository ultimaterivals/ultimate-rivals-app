# Baseline técnico

Data: 2026-08-01

## Runtime e dependências principais

- Node.js: 24.16.0
- npm: 11.13.0
- Next.js: 16.2.12
- TypeScript: 5.9.3
- `@supabase/supabase-js`: 2.111.0
- `@supabase/ssr`: 0.12.4

## Execução

```bash
npm install
npm run dev
npm run build
npm run start
```

## Qualidade e testes

```bash
npm run format
npm run lint
npm run typecheck
npm run test
npx playwright test
```

## Portais e rotas

- `/`: página pública temporária.
- `/login`: autenticação por e-mail e senha.
- `/admin`: base administrativa protegida para admin, operator, pole_manager e team_manager.
- `/athlete`: base protegida do atleta.
- `/api/health`: liveness check.

## Funcionalidades existentes

- Clientes Supabase de navegador e servidor.
- Renovação de cookies de sessão via Proxy do Next.js.
- Validação de papel a partir de `app_metadata` controlado pelo servidor.
- Layouts responsivos, tokens UR e componentes UI fundamentais.
- Configuração PWA inicial, Vitest e Playwright.

## Ainda não implementado deliberadamente

Schema definitivo, cadastro de atleta, vínculos, UR Play, check-in, partidas, homologação, estatísticas, pontuação, ranking, UR Coins, repasses, auditoria persistida e sincronização offline.
