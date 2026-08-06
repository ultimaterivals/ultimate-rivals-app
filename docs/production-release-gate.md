# Production release gate — Season 1

Application status: `READY_FOR_SEASON_1`.

Production release plan: `BLOCKED`.

This is a technical pre-implantation audit. No PROD project was accessed,
created or modified. No real data was inserted. No feature development was
performed.

## Automated gates

Latest homologated baseline:

- Format: PASS
- Lint: PASS
- Typecheck: PASS
- Unit: 105 PASS
- Integration: 55 PASS
- Playwright: 68 PASS, 8 intentional project skips, 0 failures
- Build: PASS
- PWA smoke: PASS for local app shell assets
- GitHub Migration Replay: PASS at baseline commit

## Manual gates

- Enable leaked password protection before real signup.
- Provision PROD and verify project name/ref before any operation.
- Configure Auth Site URL and redirect URLs.
- Configure Storage buckets and policies for media/video before real media.
- Configure backups before first PROD migration.
- Confirm legal/privacy copy visible to athletes.
- Confirm domain/HTTPS and PWA installability on real URL.

## Technical blockers

1. PROD-forbidden DEV fixtures are present in the canonical migration chain:
   - partner/market fake DEV offers;
   - public calendar DEV events.
2. Deployment target is not configured in the repository. No Vercel/Netlify/etc.
   project metadata was found locally.

The first item blocks PROD migration replay. The second item blocks actual
deployment execution but not the application code status.

## Owner decisions required

- Cadastro aberto vs cadastro controlado/aprovado.
- Official production domain and www/non-www canonical form.
- Initial real poles, venues and courts.
- Published prices, packages and payment operation policy.
- Which Market products/offers start active, if any.
- Which real sponsors/partners start active, if any.
- Whether Q1 reference prize/repass values become official.

## CI checks required before merge/go-live

- migration replay;
- format check;
- lint;
- typecheck;
- unit tests;
- integration tests;
- full E2E desktop/mobile;
- build.

## Release tag strategy

Recommended, not executed:

- `season-1-rc` for the audited release candidate.
- `season-1-v1.0.0` only after owner approval and final go-live gates.

Do not create the final tag before approval.

## Status separation

`READY_FOR_SEASON_1` can remain true while `PRODUCTION_RELEASE_PLAN` is blocked.
The blocker is deployment hygiene around PROD replay data, not missing product
functionality.
