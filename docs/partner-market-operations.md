# Venue partners, UR Events, sponsors and Market

This module completes the P0 business operations layer for Season 1 without creating a parallel venue, event or tournament engine.

## Venue partnerships

Venues and courts continue to come from the official `venues` and `courts` tables. The final layer adds:

- `venue_partnerships`;
- `venue_availability`;
- `venue_rates`;
- `venue_commercial_rules`;
- `admin_venue_partner_operations`.

The admin surfaces are:

- `/admin/venues`;
- `/admin/venues/[id]`.

## UR Events

`partner_events` supports:

- internal tournament;
- clinic;
- corporate;
- festival;
- challenge;
- special;
- custom.

Events default to `official_ranking_event = false`. Non-official events do not feed ranking. Only a future explicit official event with a valid Competition Engine reference may feed ranking.

Admin surface:

- `/admin/events`.

## Sponsors

The sponsor module adds:

- `sponsors`;
- `sponsorship_agreements`;
- `sponsorship_assets`;
- `sponsorship_activations`;
- `sponsorship_deliveries`;
- `sponsorship_revenue_allocations`.

The delivery workflow uses `planned`, `delivered`, `waived` and `cancelled`.

Admin surface:

- `/admin/sponsors`.

## Venue share

Only eligible cash/mixed sponsorship agreements can generate venue share. The database blocks allocations above 20% per agreement.

Default operational interpretation:

- Betim + Contagem activation: 10% + 10%.
- Betim only: up to 20%.
- Contagem only: up to 20%.

No transfer is automatic; finance can create obligations from the projection.

## Market MVP

Market works without UR Coins. The Q1 DEV seed includes public BRL offers for hydration, snack, recovery and UR merch.

Tables:

- `market_partners`;
- `market_items`;
- `market_offers`;
- `market_benefits`;
- `market_redemptions`.

Surfaces:

- `/admin/market`;
- `/athlete/market`.

Redemptions are private to the athlete and admin/operator.
