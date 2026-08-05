# Internal notifications

## Storage

`public.notifications` stores athlete ownership, a constrained notification type, title, body, internal action route, source, idempotency key, safe metadata, occurrence time, and read time.

Supported types are registration confirmation, waitlist promotion, match call, homologated result, ranking movement, assessment availability, level change, and team membership change.

Private trigger functions enqueue notifications with `ON CONFLICT (idempotency_key) DO NOTHING`. Inserts are globally audited; read receipts are intentionally not written to the global audit log.

## Access

- Athlete: select own rows and update only `read_at` on own rows.
- Admin: operational read.
- Team manager and pole manager: no rows.
- Anon: no table privilege.
- Client sessions cannot insert or delete notifications.

The inbox groups unread and previous items and supports individual or bulk read receipts.

## Season 1 final types

The enum also supports the final internal inbox categories for tournaments, eligibility, Series, Cup, Legends, training, development review, Hunter, payment verified, Market offer/redemption, wallet earn/spend, and repass announced. These remain internal inbox notifications; no external push was implemented.
