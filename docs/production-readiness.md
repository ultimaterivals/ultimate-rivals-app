# Production readiness

Status: `PRODUCTION_RELEASE_PLAN_APPROVED_READY`.

Production baseline: `READY`.

Deployment target: `VERCEL_MANUAL_LINK_REQUIRED`.

Status desta completion run: somente DEV homologado. Nenhuma operacao foi executada em PROD.

## Antes de PROD

1. Confirmar project ref PROD no dashboard e no CLI.
2. Fazer backup completo do banco PROD.
3. Revisar migrations aplicadas no DEV e ordem de aplicacao.
4. Habilitar configuracoes manuais de Auth, incluindo leaked password protection se disponivel.
5. Configurar Storage privado para midia de origem.
6. Executar admin bootstrap controlado.
7. Rodar smoke tests publicos e autenticados.
8. Rodar subset do Golden Path.
9. Rodar Security Advisor e Performance Advisor.

## Bloqueios externos

- Advisors nao estao expostos no conector atual.
- CLI local nao esta autenticado com `SUPABASE_ACCESS_TOKEN`; usar dashboard/CLI autenticado no go-live.
- Nenhum dado real deve ser importado ate a matriz de privacidade ser revisada.

## RC1.2 migration replay gate

Status as of 2026-08-05:

- Fresh replay via GitHub Actions: `PASS`
- Workflow run: `https://github.com/ultimaterivals/ultimate-rivals-app/actions/runs/31047123055`
- Canonical migration source: repository local migration chain
- Application schema alignment against DEV: `PASS`
- Critical RLS/security drift for `anon`/`authenticated`: `0`
- DEV migration history alignment: `DIVERGENT_DOCUMENTED`
- DEV history repair: `DEFERRED`
- Production touched: no
- Real data inserted: no

Decision:

- `MIGRATION_SEQUENCE_REPRODUCIBLE = PASS` for application release because fresh replay and schema equivalence are proven.
- Do not repair DEV history now.
- Do not fabricate timestamps or create empty migrations to match counts.
- Future PROD must be created from the canonical repository migration chain, not by copying DEV's divergent migration history.

Deployment impact:

- DEV history divergence is not a P0 application-release blocker.
- Production deployment still requires normal manual pre-prod gates: PROD provisioning, Auth dashboard settings, HTTPS/PWA installability smoke, backups, and real-data onboarding controls.
