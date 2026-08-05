# Tournament Engine

Sprint 12 introduces the additive foundation for UR Series, UR Cup and UR Legends.

## Scope

- UR Series maps to `pole_tournament`.
- UR Cup maps to `regional`.
- UR Legends maps to `legends`.
- UR Play remains `ur_play` and keeps its single-game 11 point format.
- Official tournament levels are N1 and N2. N3 remains available for UR Play, training, leveling and development.

## Match Format

UR Play uses `single_game`: one rally-point game to 11 with `win_by = 1`.

Series, Cup and Legends use `best_of_3`:

- Set 1: 21, `win_by = 2`
- Set 2: 21, `win_by = 2`
- Set 3: 15, `win_by = 2`

`GAME_POINT` is the rally that closes the match, not every set point.

## Formats

- 3 to 5 formations: `league`
- 6 to 8 formations: `groups_championship`
- 9 to 12 formations: `power_stage`

Level has priority over field size. N1 and N2 never share a bracket to complete a field.

## Eligibility

The base Q1 rule is three homologated UR Play matches per athlete. Starters and reserves use the same requirement.

The projection considers athlete, season, level, roster, team, pole, homologated UR Play matches, discipline, registration status, category and format constraints.

## Pricing

Tournament pricing is configurable in `tournament_pricing_rules`.

The operational default is:

- first entry: R$100
- second entry: R$90
- third and later entries: R$85

Pricing is frozen per tournament/division before publication. No payment gateway, repasse or online payment flow is part of Sprint 12.

## Results And Ranking

Tournament results are stored as official snapshots. Champion, runner-up and third place do not automatically receive ranking bonus points.

When a tournament match is homologated, the existing ranking engine remains responsible for points. The match `event_context` determines the context:

- Series: `pole_tournament`
- Cup: `regional`
- Legends: `legends`

## Public Data

Public competition pages use published tournament data and homologated results only. They must not expose private registration details, contact data or raw ledger rows.

## Out Of Scope

UR Coins, UR Market, online payments, repasses, sponsors, AI, video automation and external push are intentionally not started in this sprint.
