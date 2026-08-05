# Season 1 final schema notes

## Placeholder migration `20260805173258_season_venue_sponsor_market_operations.sql`

The final completion prompt referenced a placeholder migration named `20260805173258_season_venue_sponsor_market_operations.sql`.

Checks performed on this run:

- The file is not tracked in Git at HEAD `8b63cbf829e7fba6266edb84cac6b20b71b50d70`.
- The file is not present in the local working tree.
- The DEV migration history for `ultimate-rivals-dev / jrzmqlhfkhaejvmiyxzy` does not include version `20260805173258`.

Decision:

- Do not recreate that timestamp.
- Do not edit historical migrations.
- Use new additive migrations with later timestamps:
  - `20260805175750_season_partner_market_core.sql`
  - `20260805175800_season_partner_market_views_seed_rls.sql`

This keeps the drift visible and avoids pretending that a previously discussed placeholder was applied.

## Partner, sponsor and Market scope

The partner/Market block reuses official entities instead of creating parallel registries:

- `poles`
- `venues`
- `courts`
- `calendar_events`
- `event_checklists`
- `event_staff_assignments`
- `revenue_entries`
- `expense_entries`

New tables are additive and operational:

- venue partnerships, availability, rates and commercial rules;
- partner events that default to non-ranking;
- sponsors, agreements, assets, activations, deliveries and venue-share allocations;
- Market partners, items, offers, benefits and redemptions.

## 20% venue-share rule

`sponsorship_revenue_allocations` is protected by `private.enforce_sponsorship_share_cap()`.

Rules enforced in the database:

- only agreements marked `venue_share_eligible = true` can generate venue share;
- only cash/mixed agreements can generate venue share;
- allocation sum per agreement cannot exceed 20%;
- no transfer is executed automatically.

## Privacy and RLS

All new public tables have RLS and FORCE RLS.

- Sponsor contracts are admin/operator only.
- Venue partner operations are admin/operator/pole-manager scoped.
- Market public offers can be read publicly.
- Market redemptions are private to the athlete plus admin/operator.
- No real data or athlete data was inserted.
