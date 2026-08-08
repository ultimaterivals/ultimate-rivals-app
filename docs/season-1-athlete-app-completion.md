# Ultimate Rivals — Season 1 Athlete App Completion

Status: feature freeze respected. This document covers the athlete-facing product layer completed on `feature/athlete-identity-ranking-visuals`.

No production database, development database, real athlete, real payment, real sponsor, sports rule, ranking formula, points engine, UR Play engine, tournament engine, or deployment change is authorized by this sprint.

## Completion matrix

| Module            | Implemented                                                                                                                        | Tested                                  | Production-ready                     | Manual gate / known risk                                                    |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------- |
| Auth              | Existing role-gated athlete shell preserved.                                                                                       | Covered by existing auth/service tests. | Yes, subject to environment secrets. | Auth smoke requires authenticated environment.                              |
| Home / Season Hub | `/athlete` now answers current position, next action, agenda, ranking, season, formations, pole and operational feed.              | Typecheck/build/unit gates.             | Yes.                                 | Visual screenshot requires seeded authenticated local env.                  |
| Profile           | Existing profile/photo flow preserved.                                                                                             | Avatar validation tests and typecheck.  | Yes.                                 | Storage bucket policy must exist in target env.                             |
| Photo             | Server-side storage object validation, WebP signature check and orphan cleanup included.                                           | Typecheck/unit gates.                   | Yes.                                 | Real upload smoke requires local Supabase/storage.                          |
| Agenda            | `/athlete/agenda` split into Minha Agenda and Calendário UR, with filters and clearer interest/reservation/formation semantics.    | Typecheck/build.                        | Yes.                                 | Authenticated E2E pending local ephemeral data.                             |
| Interest          | Interest remains demand signal only; new event `interest_completed` recorded.                                                      | Typecheck/build.                        | Yes.                                 | DB constraint must include new event names through migration replay.        |
| Formation         | Formation copy and next-action routing preserved; no automatic squad creation added.                                               | Unit coverage for next action.          | Yes.                                 | Formation lifecycle remains owned by existing domain.                       |
| Reservation       | Reservation still uses real capacity; waitlist emits `reservation_waitlisted`.                                                     | Typecheck/build.                        | Yes.                                 | Capacity race protection depends on existing DB constraints/triggers.       |
| UR Play           | Existing route preserved and surfaced via agenda/secondary navigation.                                                             | Build/typecheck.                        | Yes.                                 | Full match flow E2E out of scope for this sprint.                           |
| Ranking           | Individual podium kept only for individual ranking; athlete ranking highlights self, nearby rivals and raw delta to next position. | Unit/typecheck/build.                   | Yes.                                 | No ranking formula changed.                                                 |
| Season            | New `/athlete/season` derives stages from official ranking, games, reservations and tournament registrations.                      | Unit coverage for stage derivation.     | Yes.                                 | Competition state vocabulary may grow after operations starts.              |
| Competitions      | Existing tournament/competition route preserved and connected from season stages.                                                  | Build/typecheck.                        | Yes.                                 | No tournament engine change.                                                |
| Payments          | No payment feature created or modified.                                                                                            | Not applicable.                         | Existing only.                       | Real payment flows intentionally outside this sprint.                       |
| UR Coins          | Wallet display separated from ranking points on Season Hub.                                                                        | Build/typecheck.                        | Yes.                                 | Ledger correctness remains owned by wallet domain.                          |
| Development       | Existing development route preserved.                                                                                              | Build/typecheck.                        | Existing only.                       | No progression rules changed.                                               |
| Hunter            | No Hunter implementation or rule change.                                                                                           | Not applicable.                         | Out of scope.                        | Product scope explicitly excluded.                                          |
| Notifications     | Operational feed and next action can route to notifications; event names allow `notification_opened`.                              | Build/typecheck.                        | Yes.                                 | Open event wiring can be expanded when notification detail UX is finalized. |
| PWA               | PWA assets/routes not intentionally changed.                                                                                       | Build gate.                             | Existing only.                       | HTTPS installability smoke requires deployed/preview URL.                   |

## Product invariants

- Interest does not reserve capacity.
- Formation does not create a confirmed reservation by itself.
- Reservation does not imply check-in.
- UR Coins are presented separately from ranking points.
- Season stages do not award points, coins, XP, prizes or hidden eligibility.
- Ranking visuals do not alter ranking calculations, tiebreaks, transactions, medals or homologation.
- Public ranking podium is individual-only; non-individual rankings keep the top three in the normal list.
- Tracking is first-party, operational and sanitized against PII.

## `/athlete` route audit

No route was deleted, redirected or deprecated in code during this sprint.

| Route                          | Classification | Rationale                                                                                    |
| ------------------------------ | -------------- | -------------------------------------------------------------------------------------------- |
| `/athlete`                     | KEEP           | Season Hub and primary start experience.                                                     |
| `/athlete/agenda`              | KEEP           | Primary operational map for calendar, interest, reservation and waitlist.                    |
| `/athlete/ranking`             | KEEP           | Primary individual competitive state and nearby rivals.                                      |
| `/athlete/season`              | KEEP           | New season journey view connected to official state.                                         |
| `/athlete/profile`             | KEEP           | Primary identity/photo/profile management.                                                   |
| `/athlete/profile/edit`        | KEEP           | Existing edit route for profile details.                                                     |
| `/athlete/ur-play`             | MERGE          | Still preserved, but UX entry is now Agenda/Season Hub to reduce mobile fragmentation.       |
| `/athlete/ur-play/[sessionId]` | KEEP           | Session detail remains necessary for deep links.                                             |
| `/athlete/competitions`        | KEEP           | Tournament state for Series/Cup/Legends.                                                     |
| `/athlete/competitions/[id]`   | KEEP           | Competition detail/deep link.                                                                |
| `/athlete/matches`             | KEEP           | Match history and detail path.                                                               |
| `/athlete/matches/[id]`        | KEEP           | Current/previous match detail.                                                               |
| `/athlete/performance`         | KEEP           | Deeper performance analytics; not primary mobile nav.                                        |
| `/athlete/wallet`              | KEEP           | UR Coins ledger separated from ranking points.                                               |
| `/athlete/points`              | KEEP           | Existing points ledger route; not primary mobile nav.                                        |
| `/athlete/development`         | KEEP           | Technical development/Hunter-adjacent state remains separate.                                |
| `/athlete/journey`             | MERGE          | Concept overlaps with `/athlete/season`; keep until usage/redundancy is reviewed with owner. |
| `/athlete/market`              | KEEP           | Existing market route; not changed by this sprint.                                           |
| `/athlete/billing`             | KEEP           | Existing commercial route; no payment logic changed.                                         |
| `/athlete/notifications`       | KEEP           | Operational inbox/feed source.                                                               |

## Required gates

- `git diff --check`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- Migration replay on local ephemeral Supabase when available
- Integration tests only against local ephemeral environment
- Authenticated Playwright desktop/mobile only against local ephemeral environment

## Manual gates still dependent on environment

- Authenticated screenshots for home, agenda, ranking, season, competition detail, reservation/interest flow and avatar fallback.
- Local ephemeral Supabase migration replay if Docker/Supabase local services are unavailable.
- Playwright authenticated flows if no local test user/session exists.
