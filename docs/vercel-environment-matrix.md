# Vercel environment matrix

Do not version real values. Configure these in Vercel project settings only.

| Variable                               | Production                                            | Preview                                 | Development | Exposure              | Notes                                                   |
| -------------------------------------- | ----------------------------------------------------- | --------------------------------------- | ----------- | --------------------- | ------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Required, future PROD only                            | Required, DEV/QA only until PROD exists | Required    | Public                | Must match the intended Supabase project.               |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Required, future PROD only                            | Required, DEV/QA only until PROD exists | Required    | Public                | Publishable/anon key only.                              |
| `NEXT_PUBLIC_APP_URL`                  | Required                                              | Required                                | Optional    | Public                | Used for canonical URL, redirects and PWA smoke.        |
| `UR_TEST_PASSWORD`                     | Not configured                                        | Optional for preview test jobs only     | Local only  | Secret                | Never a real user password.                             |
| `UR_TEST_COURT_OPS_SESSION_ID`         | Not configured                                        | Optional for preview test jobs only     | Local only  | Secret-ish fixture id | DEV/test fixture only.                                  |
| `SUPABASE_SERVICE_ROLE_KEY`            | Server/admin only if a future backend job requires it | Avoid                                   | Avoid       | Secret                | Never `NEXT_PUBLIC_*`; never used to mask RLS failures. |

Preview may temporarily point to the validated DEV Supabase project for QA,
provided no real data is present and redirects are marked Preview/QA.

Production must not point to DEV. Production Supabase is created only after
explicit authorization.
