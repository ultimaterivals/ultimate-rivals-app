# Supabase PROD requirements — Season 1

Do not execute this runbook until the owner authorizes PROD provisioning.

## Project

- Create a dedicated Supabase PROD project for Ultimate Rivals.
- Record project name, project ref, region and organization.
- Verify the project ref before every migration, seed, SQL, Auth or Storage
  operation.
- Do not clone DEV history or copy DEV data.

## Database

- Start from an empty database.
- Apply the canonical repository migration chain only after PROD-forbidden DEV
  fixtures are removed/gated.
- Run Security Advisor and Performance Advisor after migration replay.
- Keep RLS enabled on public tables.
- Do not use service role to mask RLS failures.

## Extensions

- `btree_gist` is currently installed by the canonical chain.
- Preferred PROD exploration: install extensions in a dedicated schema if fresh
  replay proves compatibility.
- If moving the extension is not proven safe, accept the warning for launch and
  track as technical backlog.

## Auth

- Configure Site URL to the real HTTPS app URL.
- Configure redirect URLs for:
  - local development;
  - preview/staging if used;
  - final production domain.
- Decide signup mode: `OWNER_DECISION_REQUIRED` for open signup vs controlled
  onboarding.
- Email/password auth is expected.
- Enable leaked password protection: `MANUAL_PRE_PROD_REQUIRED`.
- Decide email verification policy before real onboarding.
- Set session duration appropriate for an operational sports app.

## Storage

Required existing buckets from the canonical chain:

| Bucket            | Public | MIME          | Size | Access                                           |
| ----------------- | ------ | ------------- | ---- | ------------------------------------------------ |
| `athlete-avatars` | false  | JPEG/PNG/WebP | 5 MB | athlete own folder; admin manage                 |
| `team-logos`      | false  | JPEG/PNG/WebP | 5 MB | team manager own team; admin manage; scoped read |

Additional PROD media requirement before real video operations:

| Bucket             | Public           | MIME                            | Size          | Access                                                                       |
| ------------------ | ---------------- | ------------------------------- | ------------- | ---------------------------------------------------------------------------- |
| `media-master`     | false            | video formats approved by ops   | owner-defined | admin/operator/media only, signed URLs                                       |
| `media-highlights` | false by default | video/image approved highlights | owner-defined | publish only through explicit public metadata                                |
| `documents`        | false            | PDF/doc/image as approved       | owner-defined | admin/operator only unless a specific athlete/team document flow is approved |

Private buckets must not grant anon SELECT. Public highlights should be exposed
through explicit publishable metadata, not by making master buckets public.

## Realtime

No mandatory production Realtime requirement is documented for Season 1 launch.
If enabled later for scoreboards/court operations, policies and load testing
must be added before use.

## Public API

- Only publishable key goes to browser.
- `SUPABASE_SERVICE_ROLE_KEY` stays server/admin-only and is not used by this
  app client.
- Data API access must rely on grants plus RLS.

## SMTP/email

- Configure a verified SMTP/domain sender before real auth emails.
- Confirm password reset and email verification links use the production URL.

## Backups

- Enable automatic backups according to Supabase plan.
- Take an explicit backup immediately before first PROD migration.
