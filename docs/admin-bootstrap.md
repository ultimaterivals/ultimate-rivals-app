# Bootstrap do primeiro administrador

The first administrator is not promoted by the client, automatic signup or user
metadata. The process is intentionally administrative, auditable and one-time.

## Preconditions

1. Confirm the Supabase project name and project ref.
2. Confirm the environment is the intended target.
3. Create and verify the user in Supabase Auth.
4. Take a backup/snapshot before the change.
5. Record the external approval/change ticket.

## Execution

Use `scripts/bootstrap-admin.sql` from a trusted administrative SQL session. The
script requires:

- `auth_user_id`: UUID of the existing `auth.users` row;
- `display_name`: human-readable name for the admin profile;
- `operator_note`: change ticket or operator note, with no secrets.

The script inserts or updates `public.profiles` with `role = 'admin'` and
`status = 'active'`, then writes an `audit_logs` entry with action
`bootstrap_admin`.

## Post-checks

1. Sign in using the publishable key only.
2. Confirm admin access through the normal RLS-protected application path.
3. Confirm a non-admin user cannot promote itself.
4. Confirm service role was not used by the application runtime.
5. Store the audit evidence with the release record.

After bootstrap, only an existing admin may manage profiles through policies.
Never expose a public promotion endpoint and never trust `user_metadata` for
authorization.
