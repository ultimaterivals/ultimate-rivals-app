import { createClient } from "@/lib/supabase/server";

export async function fetchAdminUrPlayPreflightRepositoryData(
  sessionIds: string[],
) {
  if (sessionIds.length === 0) {
    return {
      checks: [],
      registrations: [],
      checkins: [],
      staff: [],
      scopes: [],
      errors: [] as string[],
    };
  }

  const supabase = await createClient();
  const [checksResult, registrationsResult, checkinsResult, staffResult, scopesResult] =
    await Promise.all([
      supabase
        .from("ur_play_session_preflight_checks")
        .select("session_id,check_key,is_checked,note,updated_at")
        .in("session_id", sessionIds),
      supabase
        .from("ur_play_registrations")
        .select("session_id,registration_status")
        .in("session_id", sessionIds),
      supabase
        .from("ur_play_checkins")
        .select("session_id,status")
        .in("session_id", sessionIds),
      supabase
        .from("ur_play_session_staff")
        .select("session_id,role,status,starts_at,ends_at")
        .in("session_id", sessionIds),
      supabase
        .from("ur_play_session_scopes")
        .select("session_id,format_id")
        .in("session_id", sessionIds),
    ]);

  const errors: string[] = [];
  for (const [source, error] of [
    ["preflight_checks", checksResult.error],
    ["registrations", registrationsResult.error],
    ["checkins", checkinsResult.error],
    ["staff", staffResult.error],
    ["scopes", scopesResult.error],
  ] as const) {
    if (error) errors.push(`${source}: ${error.message}`);
  }

  return {
    checks: checksResult.error ? [] : (checksResult.data ?? []),
    registrations: registrationsResult.error
      ? []
      : (registrationsResult.data ?? []),
    checkins: checkinsResult.error ? [] : (checkinsResult.data ?? []),
    staff: staffResult.error ? [] : (staffResult.data ?? []),
    scopes: scopesResult.error ? [] : (scopesResult.data ?? []),
    errors,
  };
}
