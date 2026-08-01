import type { SupabaseClient } from "@supabase/supabase-js";
export async function searchTeams(
  client: SupabaseClient,
  filters: { query?: string; poleId?: string; status?: string },
) {
  let q = client
    .from("teams")
    .select(
      "id,name,slug,short_name,logo_url,primary_pole_id,status,created_at,poles(name)",
    );
  if (filters.query)
    q = q.ilike("name", `%${filters.query.replace(/[%_,()]/g, "")}%`);
  if (filters.poleId) q = q.eq("primary_pole_id", filters.poleId);
  if (filters.status) q = q.eq("status", filters.status);
  const { data, error } = await q.order("name");
  if (error) throw error;
  const rows = await Promise.all(
    (data ?? []).map(async (team) => {
      const [{ count: athletes }, { count: rosters }, { data: manager }] =
        await Promise.all([
          client
            .from("team_memberships")
            .select("id", { count: "exact", head: true })
            .eq("team_id", team.id)
            .eq("status", "active"),
          client
            .from("team_rosters")
            .select("id", { count: "exact", head: true })
            .eq("team_id", team.id)
            .neq("status", "archived"),
          client
            .from("team_manager_assignments")
            .select(
              "management_role,profiles!team_manager_assignments_profile_id_fkey(display_name)",
            )
            .eq("team_id", team.id)
            .eq("status", "active")
            .order("starts_at")
            .limit(1)
            .maybeSingle(),
        ]);
      return {
        ...team,
        athlete_count: athletes ?? 0,
        roster_count: rosters ?? 0,
        manager,
      };
    }),
  );
  return rows;
}
export async function getTeamDetail(client: SupabaseClient, id: string) {
  const { data: team, error } = await client
    .from("teams")
    .select(
      "id,name,slug,short_name,logo_url,primary_pole_id,description,founded_at,instagram_handle,status,created_at,poles(name)",
    )
    .eq("id", id)
    .single();
  if (error) throw error;
  const [managers, memberships, rosters, poles, audit, directory] =
    await Promise.all([
      client
        .from("team_manager_assignments")
        .select(
          "id,profile_id,management_role,starts_at,ends_at,status,profiles!team_manager_assignments_profile_id_fkey(display_name)",
        )
        .eq("team_id", id)
        .order("starts_at", { ascending: false }),
      client
        .from("team_memberships")
        .select(
          "id,athlete_id,membership_type,starts_at,ends_at,status,seasons(name)",
        )
        .eq("team_id", id)
        .order("starts_at", { ascending: false }),
      client
        .from("team_rosters")
        .select(
          "id,name,level,status,season_id,category_id,format_id,competitive_categories(code,name),competitive_formats(code,name),team_roster_members(id,athlete_id,role,is_captain,status)",
        )
        .eq("team_id", id)
        .order("created_at", { ascending: false }),
      client
        .from("team_pole_assignments")
        .select("id,pole_id,starts_at,ends_at,status,poles(name),seasons(name)")
        .eq("team_id", id)
        .order("starts_at", { ascending: false }),
      client
        .from("audit_logs")
        .select("id,action,entity_type,created_at,actor_user_id")
        .in("entity_id", [id])
        .order("created_at", { ascending: false })
        .limit(30),
      client
        .from("athlete_public_profiles")
        .select("athlete_id,athlete_code,public_name,avatar_url"),
    ]);
  for (const r of [managers, memberships, rosters, poles, audit, directory])
    if (r.error) throw r.error;
  return {
    team,
    managers: managers.data ?? [],
    memberships: memberships.data ?? [],
    rosters: rosters.data ?? [],
    poleHistory: poles.data ?? [],
    audit: audit.data ?? [],
    directory: directory.data ?? [],
  };
}
export async function getManagedTeamId(
  client: SupabaseClient,
  profileId: string,
) {
  const { data, error } = await client
    .from("team_manager_assignments")
    .select("team_id")
    .eq("profile_id", profileId)
    .eq("status", "active")
    .lte("starts_at", new Date().toISOString())
    .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.team_id ?? null;
}
