# Agenda, demand, booking and acquisition

This is the final Season 1 feature layer before feature freeze.

## Semantics

- Interest means intent only. It does not occupy capacity, consume credit,
  generate attendance or affect ranking.
- Formation means a sports group being assembled. Singles are never
  auto-converted into formations.
- Reservation means capacity is occupied or waitlisted.
- Participation means actual sports attendance/performance.

## Opportunity states

- `collecting_interest`
- `forming`
- `almost_full`
- `confirmed`
- `full`
- `waitlist`
- `closed`
- `cancelled`

`confirmed` is not the same as `full`: target formations confirm operational
viability, while max/capacity controls second-court growth.

## Deterministic demand signals

- `READY_TO_OPEN`
- `ALMOST_FULL`
- `SESSION_CONFIRMED`
- `SECOND_COURT_OPPORTUNITY`
- `LOW_DEMAND`

No GenAI is used for demand signals.

## Training demand

Training interest windows collect demand before a confirmed training session
exists. Reaching quorum creates an operational signal; admins still confirm
court, coach, price, capacity and date/time manually.

## Acquisition

The acquisition layer is first-party. It stores semantic events and normalized
sources (`direct`, `instagram`, `whatsapp`, `google`, `ads`,
`athlete_referral`, `team_referral`, `venue`, `sponsor`, `event`, `media`,
`other`) without third-party pixels, fingerprinting, raw IP or GPS.
