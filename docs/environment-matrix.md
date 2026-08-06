# Environment matrix

Feature freeze status: `ACTIVE`.

No production Supabase project was accessed, created or configured in this gate.

## Environments

| Environment | Purpose                                           | Real data                                    | Supabase project                             |
| ----------- | ------------------------------------------------- | -------------------------------------------- | -------------------------------------------- |
| DEV         | Development, homologation and fictitious fixtures | Forbidden                                    | `ultimate-rivals-dev / jrzmqlhfkhaejvmiyxzy` |
| CI          | Fresh replay, static checks and automated tests   | Forbidden                                    | Ephemeral/local replay only                  |
| PROD        | Future real Season 1 operation                    | Allowed only after explicit go-live approval | Not configured in this stage                 |

## Application variables

| Variable                               | Scope                        | Required in DEV             | Required in PROD | Notes                                                              |
| -------------------------------------- | ---------------------------- | --------------------------- | ---------------- | ------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`             | Client/server public runtime | Yes                         | Yes              | Must point to the verified environment only.                       |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Client/server public runtime | Yes                         | Yes              | Public anon/publishable key only.                                  |
| `NEXT_PUBLIC_APP_URL`                  | Public app URL               | Optional locally            | Yes              | Required for canonical links, Auth redirects, PWA and smoke tests. |
| `UR_TEST_PASSWORD`                     | Test runner only             | Yes for authenticated tests | No               | Never use for real users.                                          |
| `UR_TEST_COURT_OPS_SESSION_ID`         | Test runner only             | Optional                    | No               | DEV/CI fixture identifier only.                                    |

## Supabase platform variables and secrets

The repository references optional Supabase platform placeholders in
`supabase/config.toml`, including SMS/OAuth/S3 related settings. These are not
application client variables and must be configured only inside the appropriate
Supabase project or deployment secret store when the feature is intentionally
enabled.

`SUPABASE_SERVICE_ROLE_KEY` is server-only and is not required by the browser
application. It must never be stored as `NEXT_PUBLIC_*`, sent to the client,
used in Playwright to bypass RLS, or used to hide authorization failures.

## File policy

- `.env.local` must remain unversioned.
- `.env.example` may contain names only, never real secrets.
- Production values must be kept in the deployment provider secret store.
- Before any future PROD operation, re-confirm project name, project ref and
  target URL.
