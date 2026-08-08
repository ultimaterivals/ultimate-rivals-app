# Ultimate Rivals — Season 1 Athlete App Completion

Status: feature freeze respected. This document covers the athlete-facing product layer completed on `feature/athlete-identity-ranking-visuals`.

No production database, development database, real athlete, real payment, real sponsor, sports rule, ranking formula, points engine, UR Play engine, tournament engine, or deployment change is authorized by this sprint.

## Completion matrix

| Module        | Implemented                                                                                                                                | Unit tested                           | Integration tested                                     | E2E tested                                         | Visual reviewed                                                 | Production ready              | Manual gate                                                         | Known risk                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- | ------------------------------------------------------ | -------------------------------------------------- | --------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------- |
| AUTH          | Existing role-gated athlete shell preserved.                                                                                               | PASS via auth/service unit tests.     | CI ephemeral workflow configured.                      | CI ephemeral workflow configured.                  | CI screenshot flow configured.                                  | Yes, subject to env security. | Leaked password protection and signup policy before public opening. | Auth smoke depends on target env config.                             |
| HOME          | `/athlete` is the Season Hub with athlete identity, next action, ranking, agenda, season, formations, pole, UR Coins and operational feed. | PASS for next-action rules.           | CI ephemeral workflow configured.                      | CI athlete flow configured.                        | Screenshots configured for desktop/mobile.                      | Yes.                          | Owner UX review.                                                    | Partial data relies on graceful empty states.                        |
| PROFILE       | Existing profile/photo route preserved.                                                                                                    | PASS through validation/type gates.   | CI ephemeral workflow configured.                      | CI profile screenshot configured.                  | Screenshot configured.                                          | Yes.                          | Storage policy smoke in target env.                                 | Real upload depends on Storage availability.                         |
| PHOTO         | Server-side object validation, WebP signature check and orphan cleanup included.                                                           | PASS through service/type gates.      | CI ephemeral workflow configured for storage/security. | Profile flow configured.                           | Profile with photo/fallback must be reviewed from CI artifacts. | Yes.                          | Manual review of upload UX.                                         | Dimension validation remains client-processing oriented.             |
| AGENDA        | `/athlete/agenda` split into Minha Agenda and Calendário UR with filters and clear interest/reservation/formation semantics.               | PASS through type/build.              | CI ephemeral workflow configured.                      | CI agenda flow configured.                         | Screenshot configured.                                          | Yes.                          | Owner UX review.                                                    | Date filter can be expanded when domain exposes richer date windows. |
| INTEREST      | Interest remains a demand signal only; emits `interest_completed`/`interest_cancelled`.                                                    | PASS through type/build.              | CI ephemeral workflow configured.                      | CI interest flow configured.                       | Flow screenshot configured.                                     | Yes.                          | Confirm event taxonomy after analytics review.                      | No social/chat mechanics added.                                      |
| FORMATION     | Formation is presented as partner/readiness state, not auto-confirmation.                                                                  | PASS for next-action priority.        | CI ephemeral workflow configured.                      | Covered through agenda/season journey.             | Agenda visual review.                                           | Yes.                          | Owner review for future partner matching.                           | Formation lifecycle remains in existing domain.                      |
| RESERVATION   | Reservation uses real capacity/waitlist and emits `reservation_completed`/`reservation_waitlisted`.                                        | PASS through type/build.              | CI ephemeral workflow configured.                      | CI reservation path configured where data permits. | Flow screenshot configured.                                     | Yes.                          | Conflict handling smoke in ephemeral CI.                            | Capacity race protection remains DB/domain-owned.                    |
| UR PLAY       | Existing route preserved and surfaced via Home, Agenda and Season.                                                                         | PASS through build.                   | CI ephemeral workflow configured.                      | Covered by navigation smoke.                       | Review via Home/Agenda/Season screenshots.                      | Yes.                          | Full UR Play flow remains release smoke.                            | No rotation rule changed.                                            |
| RANKING       | Individual podium only; non-individual top 3 preserved; athlete ranking highlights self, nearby rivals and raw points delta.               | PASS through ranking/unit/type gates. | CI ephemeral workflow configured.                      | CI ranking route configured.                       | Screenshot configured.                                          | Yes.                          | Owner visual review.                                                | No ranking formula changed.                                          |
| SEASON        | New `/athlete/season` derives stages from ranking, matches, reservations and tournament registrations.                                     | PASS for stage derivation.            | CI ephemeral workflow configured.                      | CI season route configured.                        | Screenshot configured.                                          | Yes.                          | Owner language review.                                              | Competition state vocabulary may grow after operations starts.       |
| COMPETITIONS  | Existing tournament/competition route preserved and connected from season stages.                                                          | PASS through build.                   | CI ephemeral workflow configured.                      | Public/athlete navigation coverage configured.     | Competition detail screenshot remains CI/manual artifact.       | Yes.                          | Manual review of tournament interest copy.                          | No tournament engine change.                                         |
| PAYMENTS      | No payment feature created or modified.                                                                                                    | Not applicable.                       | Not applicable for this sprint.                        | Not applicable for this sprint.                    | Not applicable.                                                 | Existing only.                | Real payment release gate remains separate.                         | Payment flows intentionally outside this sprint.                     |
| UR COINS      | Wallet balance shown separately from ranking points.                                                                                       | PASS through build/type.              | CI ephemeral workflow configured.                      | Home/wallet navigation available.                  | Home screenshot configured.                                     | Yes.                          | Ledger correctness remains wallet-domain gate.                      | No coin rules changed.                                               |
| DEVELOPMENT   | Existing development route preserved.                                                                                                      | PASS through build.                   | CI ephemeral workflow configured.                      | Navigation smoke available.                        | Manual review if included in RC.                                | Existing only.                | Progression/Hunter owner review.                                    | No progression rules changed.                                        |
| HUNTER        | No Hunter implementation or rule change.                                                                                                   | Not applicable.                       | Not applicable.                                        | Not applicable.                                    | Not applicable.                                                 | Out of scope.                 | Future Hunter product gate.                                         | Product scope explicitly excluded.                                   |
| NOTIFICATIONS | Operational feed and next action can route to notifications; event name `notification_opened` allowed.                                     | PASS through build/type.              | CI ephemeral workflow configured.                      | Inbox navigation smoke configured.                 | Home/feed review.                                               | Yes.                          | Push engine remains out of scope.                                   | Open event wiring can expand after notification detail UX finalizes. |
| PWA           | PWA assets/routes not intentionally changed.                                                                                               | PASS via build.                       | Not DB-dependent.                                      | Browser smoke configured.                          | HTTPS installability remains preview/manual.                    | Existing only.                | Preview HTTPS installability smoke.                                 | Local CI is HTTP, not installability-proof.                          |

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

| Route                          | Purpose                                                                                      | Status      |
| ------------------------------ | -------------------------------------------------------------------------------------------- | ----------- |
| `/athlete`                     | Season Hub and primary start experience.                                                     | KEEP        |
| `/athlete/agenda`              | Primary operational map for calendar, interest, reservation and waitlist.                    | KEEP        |
| `/athlete/ranking`             | Primary individual competitive state and nearby rivals.                                      | KEEP        |
| `/athlete/season`              | Season journey view connected to official state.                                             | KEEP        |
| `/athlete/profile`             | Primary identity/photo/profile management.                                                   | KEEP        |
| `/athlete/profile/edit`        | Existing edit route for profile details.                                                     | KEEP        |
| `/athlete/ur-play`             | Preserved route; primary UX entry is now Agenda/Season Hub to reduce mobile fragmentation.   | MERGE_LATER |
| `/athlete/ur-play/[sessionId]` | Session detail and deep links.                                                               | KEEP        |
| `/athlete/competitions`        | Tournament state for Series/Cup/Legends.                                                     | KEEP        |
| `/athlete/competitions/[id]`   | Competition detail/deep link.                                                                | KEEP        |
| `/athlete/matches`             | Match history.                                                                               | KEEP        |
| `/athlete/matches/[id]`        | Current/previous match detail.                                                               | KEEP        |
| `/athlete/performance`         | Deeper performance analytics, not primary mobile nav.                                        | KEEP        |
| `/athlete/wallet`              | UR Coins ledger separated from ranking points.                                               | KEEP        |
| `/athlete/points`              | Existing points ledger route, not primary mobile nav.                                        | KEEP        |
| `/athlete/development`         | Technical development/Hunter-adjacent state.                                                 | KEEP        |
| `/athlete/journey`             | Concept overlaps with `/athlete/season`; keep until usage/redundancy is reviewed with owner. | MERGE_LATER |
| `/athlete/market`              | Existing market route; not changed by this sprint.                                           | KEEP        |
| `/athlete/billing`             | Existing commercial route; no payment logic changed.                                         | KEEP        |
| `/athlete/notifications`       | Operational inbox/feed source.                                                               | KEEP        |

## Required gates

- `git diff --check`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- GitHub Actions `Athlete App Feature QA` for migration replay, feature migration invariants, integration tests and Playwright screenshots on a Supabase local stack.

## Manual release gates

- Leaked password protection before opening public onboarding.
- Legacy service-role exposure review before public onboarding.
- Public signup remains closed until the owner explicitly opens Phase 2.
- Preview HTTPS PWA installability smoke.
- Owner visual review of CI screenshots.
