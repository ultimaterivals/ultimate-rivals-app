# E2E skip audit — Season 1 production gate

Baseline: commit `c1814cff2d74112da9a0272e0c23c1ec9fee58d2`.

The Playwright suite has 2 projects: `chromium` and `mobile`. The 8 skips are
intentional project-scope skips: each scenario runs in the viewport where it is
authoritative and is skipped in the other project. The latest full run completed
with 68 passed, 8 skipped and 0 failed.

| File                                   | Test                                                                 | Skipped project | Runs in    | Reason                                                          | Since       | P0 coverage?                                                  | Classification             |
| -------------------------------------- | -------------------------------------------------------------------- | --------------- | ---------- | --------------------------------------------------------------- | ----------- | ------------------------------------------------------------- | -------------------------- |
| `tests/e2e/scoring.spec.ts`            | operator records and reviews scoring on mobile                       | `chromium`      | `mobile`   | Scoring console is homologated as a mobile court-side workflow. | Sprint 8    | Yes, covered in mobile.                                       | `INTENTIONAL_NON_BLOCKING` |
| `tests/e2e/scoring.spec.ts`            | athlete reads own result and statistics on mobile                    | `chromium`      | `mobile`   | Athlete result read is asserted in mobile shell.                | Sprint 8    | Yes, covered in mobile.                                       | `INTENTIONAL_NON_BLOCKING` |
| `tests/e2e/scoring.spec.ts`            | coordinator homologates the reviewed result                          | `mobile`        | `chromium` | Homologation is admin/coordinator desktop operation.            | Sprint 8    | Yes, covered in desktop.                                      | `INTENTIONAL_NON_BLOCKING` |
| `tests/e2e/scoring.spec.ts`            | admin corrects a homologated result and preserves history            | `mobile`        | `chromium` | Correction/audit/ranking processing is a desktop admin flow.    | Sprint 8/9  | Yes, covered in desktop.                                      | `INTENTIONAL_NON_BLOCKING` |
| `tests/e2e/scoring.spec.ts`            | athlete reads homologated points on desktop without ranking position | `mobile`        | `chromium` | Desktop negative check for points/ranking separation.           | Sprint 9/11 | Yes, covered in desktop; mobile ranking is covered elsewhere. | `INTENTIONAL_NON_BLOCKING` |
| `tests/e2e/athlete-experience.spec.ts` | mobile athlete navigation covers the primary journey                 | `chromium`      | `mobile`   | Mobile navigation is only relevant to the mobile project.       | Sprint 11   | Yes, mobile shell coverage.                                   | `INTENTIONAL_NON_BLOCKING` |
| `tests/e2e/athlete-experience.spec.ts` | compact 360px shell keeps touch-friendly destinations                | `chromium`      | `mobile`   | 360px layout check is mobile-only.                              | Sprint 11   | Yes, mobile PWA/shell coverage.                               | `INTENTIONAL_NON_BLOCKING` |
| `tests/e2e/athlete-experience.spec.ts` | desktop athlete shell exposes career navigation and key centers      | `mobile`        | `chromium` | Desktop side navigation is only present in desktop layout.      | Sprint 11   | Yes, desktop shell coverage.                                  | `INTENTIONAL_NON_BLOCKING` |

No skipped test leaves UR Play, scoring, ranking, payment, wallet, booking,
admin, operator, athlete, RLS or privacy without coverage. The skips are not
disabled tests; they are cross-project routing guards.

Production decision: skips are not a release blocker.
