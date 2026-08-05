# Privacy analytics — Season 1

Ultimate Rivals uses first-party analytics only for operational demand,
acquisition attribution and retention planning.

## What is allowed

- Essential operational events: interest, reservation, waitlist, check-in and
  participation milestones.
- Optional marketing attribution: UTM source/medium/campaign/content, referral
  codes and referrer domain when the athlete allows attribution.
- Anonymous journey IDs generated randomly by the app.
- Aggregated admin dashboards for source, funnel, conversion and retention.

## What is not collected

- Meta Pixel, Google Analytics or third-party tracking pixels.
- Fingerprinting.
- Raw IP tracking.
- GPS or continuous location.
- Passwords, phone, email, DOB, address, payments, wallet balance, private notes,
  raw analytics payloads or private media URLs in public projections.

## Public privacy boundary

Interest lists are sports-only projections. When the athlete disables public
identity or chooses aggregate visibility, the app shows only aggregate demand,
for example: `+2 atletas N2 interessados`.

Public athlete discovery may show only:

- display name;
- Athlete Code;
- public avatar;
- UR level;
- main pole and available sports context;
- team;
- public ranking/statistics/achievements;
- formats, modalities and appropriate availability.

It must never show private contact, financial, wallet, audit, analytics or
private development data.

## Retention separation

Anonymous analytics retention is separate from:

- sports history;
- finance;
- ranking;
- audit logs.

Deleting or minimizing analytics must not rewrite official sports facts, finance
records, ranking ledgers or audit trails.

## RLS posture

- Anonymous role can insert safe acquisition journeys/events only.
- Anonymous role cannot select analytics.
- Athletes can read and write only their own interests, reservations and
  training interests.
- Admins read aggregated demand/acquisition dashboards.
- Raw analytics remains admin/server-only.

## Migration decision

The local repository migration chain is the canonical source for any fresh
environment, including future PROD. DEV migration history divergence is
documented and does not block application release when fresh replay and schema
equivalence are passing.
