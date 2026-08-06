# Production go-live runbook — Season 1

This runbook is not authorization to execute PROD operations.

## Deployment target

No deployment host configuration was found in the repository. There is no local
evidence of Vercel, Netlify, Render, Railway, Fly.io or equivalent project
metadata.

Recommended compatible target for the current Next.js app:

- Node.js: 22+
- Install command: `npm ci`
- Build command: `npm run build`
- Start command: `npm run start`
- Required env: see `docs/environment-matrix.md`

## Domain and HTTPS

- Owner must choose official domain and canonical www/non-www behavior.
- Configure HTTPS before real onboarding.
- Configure Supabase Auth Site URL and redirect URLs to match the domain.
- PWA receives `INSTALLABILITY_PROD_PASS` only after HTTPS/domain smoke.

## Real data strategy

| Domain          | Entry method                  | Notes                                        |
| --------------- | ----------------------------- | -------------------------------------------- |
| Atletas         | UI or CSV import              | No DEV fixtures; validate consent/privacy.   |
| Equipes         | Admin UI                      | Add logos only through private `team-logos`. |
| Polos           | Admin UI                      | Start with minimum operational set.          |
| Quadras/Venues  | Admin UI                      | Must match real availability.                |
| Temporada       | Admin UI                      | Create Season 1 before events.               |
| Preços/Pacotes  | Admin UI after owner approval | Do not publish draft values.                 |
| Patrocinadores  | Admin UI after contracts      | No fake sponsors.                            |
| Market products | Admin UI after owner approval | Do not migrate DEV offers.                   |
| Calendário      | Admin calendar UI/templates   | No DEV public events.                        |

## Season 1 bootstrap checklist

Configure through real UI/runbook after admin bootstrap:

1. Season 1.
2. Betim and Contagem poles if confirmed.
3. Venues and courts.
4. Levels N1/N2/N3 and leveling windows.
5. Schedule templates.
6. UR Play sessions.
7. Pricing and packages.
8. Series.
9. Cup.
10. Legends.
11. Hunter themes.
12. Repass plan.

## Observability minimum

Use platform/server logs and database audit logs at launch. Track:

- application server errors;
- auth failures;
- server action failures;
- DB/RLS errors;
- manual payment operation failures;
- ranking processing failures.

Avoid capturing unnecessary PII in logs.

## Go-live sequence

1. Keep feature branch frozen.
2. Resolve PROD-forbidden fixture blocker.
3. Run full local/CI gates.
4. Create release candidate tag only after approval.
5. Provision PROD.
6. Verify project ID/name.
7. Configure Auth.
8. Configure extensions.
9. Backup empty PROD state.
10. Apply canonical migrations.
11. Configure Storage.
12. Bootstrap first admin.
13. Create Season 1.
14. Create poles.
15. Create venues/courts.
16. Configure pricing/packages.
17. Configure calendar.
18. Run PROD smoke tests.
19. If a controlled fake smoke athlete is approved, create and remove it.
20. Open real onboarding.
21. Monitor.

## Future PROD smoke plan

Do not execute tournament full E2E in PROD smoke.

PUBLIC:

- home;
- calendar;
- rankings;
- teams;
- competitions.

AUTH:

- signup/login according to owner decision;
- password reset if enabled.

ATHLETE:

- home;
- agenda;
- interest;
- booking.

ADMIN:

- dashboard;
- calendar;
- athletes.

OPERATOR:

- session/court ops read.

## Privacy go-live

Must be visible or linked before real onboarding:

- privacy/analytics explanation;
- media usage policy;
- interest-list visibility controls;
- data minimization statement.

Legal copy requires owner/legal review; this repo documentation is not legal
advice.
