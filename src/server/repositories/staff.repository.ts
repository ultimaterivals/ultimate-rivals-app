import type { SupabaseClient } from "@supabase/supabase-js";

export async function listStaffOperations(client: SupabaseClient) {
  const [roles, staff, officials] = await Promise.all([
    client
      .from("staff_role_catalog")
      .select("*")
      .order("category", { ascending: true })
      .order("role", { ascending: true }),
    client
      .from("admin_staff_directory")
      .select("*")
      .order("assigned_at", { ascending: false }),
    client
      .from("match_officiating_operations")
      .select("*")
      .order("match_code", { ascending: true })
      .limit(50),
  ]);

  for (const response of [roles, staff, officials]) {
    if (response.error) throw response.error;
  }

  return {
    roles: roles.data ?? [],
    staff: staff.data ?? [],
    officials: officials.data ?? [],
  };
}
