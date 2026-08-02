# Sprint 11 handoff

## Scope delivered

Athlete Home, contextual match priority, reserve state, next UR Play, ranking hero and target, current-month performance, season context, last match, team/pole/formations, derived feed, private notifications, performance center, match history/detail, journey, definitive athlete navigation, loading/error states, PWA install readiness, and analytics event contracts.

## Database

Applied only to `ultimate-rivals-dev` (`jrzmqlhfkhaejvmiyxzy`): `athlete_internal_notifications`. The migration is additive, enables and forces RLS, uses explicit Data API grants, and contains no destructive reset.

## Security evidence

Real DEV tests cover idempotent generation, own read/update, athlete-to-athlete IDOR, manager isolation, anon denial, client insert denial, and absence of PII in rendered Home content.

## Final validation

- Format and lint: passed.
- Typecheck: passed.
- Unit tests: 83/83 passed.
- Integration tests: 37/37 passed, including 4/4 Sprint 11 RLS cases.
- Playwright: 60 passed and 8 intentional project skips across desktop Chromium and Pixel 7, including a 360 px compact viewport.
- Production build: passed.
- Supabase Security Advisor: no new Sprint 11 warning; the two known DEV warnings remain documented for remediation.

## Out of scope

UR Coins, Market, payments, chat, generative AI, external push/SMS/WhatsApp/e-mail, Torneio de Polo, Regional, Legends, and repasses remain outside this sprint.
