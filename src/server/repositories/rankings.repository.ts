import type { SupabaseClient } from "@supabase/supabase-js";

export type RankingType = "individual" | "team" | "pole" | "doubles" | "fours";

export interface RankingFilters {
  type: RankingType;
  seasonId?: string;
  cycleId?: string;
  level?: string;
  poleId?: string;
  teamId?: string;
  search?: string;
  after?: number;
  limit?: number;
}

export async function listRankings(
  client: SupabaseClient,
  filters: RankingFilters,
) {
  let query = client
    .from("public_rankings")
    .select("*")
    .eq("ranking_type", filters.type)
    .order("current_position", { ascending: true, nullsFirst: false })
    .limit(filters.limit ?? 26);
  query = filters.seasonId ? query.eq("season_id", filters.seasonId) : query;
  query = filters.cycleId
    ? query.eq("cycle_id", filters.cycleId)
    : query.is("cycle_id", null);
  query = filters.level ? query.eq("level", filters.level) : query;
  query = filters.poleId ? query.eq("pole_id", filters.poleId) : query;
  query = filters.teamId ? query.eq("team_id", filters.teamId) : query;
  query = filters.search
    ? query.ilike("display_name", `%${filters.search}%`)
    : query;
  query = filters.after ? query.gt("current_position", filters.after) : query;
  const { data, error } = await query;
  if (error) throw error;
  return withSignedRankingAvatars(client, data ?? []);
}

export async function getRankingContext(client: SupabaseClient) {
  const [seasons, cycles, poles, teams] = await Promise.all([
    client
      .from("seasons")
      .select("id,name,status")
      .order("starts_at", { ascending: false }),
    client
      .from("season_cycles")
      .select("id,season_id,name,status")
      .order("cycle_number"),
    client.from("poles").select("id,name").order("name"),
    client.from("teams").select("id,name").order("name"),
  ]);
  for (const response of [seasons, cycles, poles, teams])
    if (response.error) throw response.error;
  return {
    seasons: seasons.data ?? [],
    cycles: cycles.data ?? [],
    poles: poles.data ?? [],
    teams: teams.data ?? [],
  };
}

export async function getAthleteRanking(
  client: SupabaseClient,
  athleteId: string,
) {
  const { data: current, error } = await client
    .from("individual_ranking")
    .select("*")
    .eq("entity_id", athleteId)
    .is("cycle_id", null)
    .order("refreshed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!current)
    return {
      current: null,
      monthly: null,
      peers: [],
      history: [],
      formations: [],
    };
  const [monthly, peers, history, formations] = await Promise.all([
    client
      .from("individual_ranking")
      .select("*")
      .eq("entity_id", athleteId)
      .not("cycle_id", "is", null)
      .order("refreshed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    client
      .from("individual_ranking")
      .select("current_position,display_name,total_points,avatar_url,entity_id")
      .eq("season_id", current.season_id)
      .eq("level", current.level)
      .is("cycle_id", null)
      .order("current_position"),
    client
      .from("ranking_snapshots")
      .select("position,total_points,captured_at,snapshot_reason")
      .eq("ranking_type", "individual")
      .eq("entity_id", athleteId)
      .eq("season_id", current.season_id)
      .is("cycle_id", null)
      .order("captured_at"),
    client
      .from("ranking_contributions")
      .select("entity_id,ranking_type,points")
      .eq("athlete_id", athleteId)
      .eq("season_id", current.season_id)
      .in("ranking_type", ["doubles", "fours"]),
  ]);
  for (const response of [monthly, peers, history, formations])
    if (response.error) throw response.error;
  return {
    current,
    monthly: monthly.data,
    peers: peers.data ?? [],
    history: history.data ?? [],
    formations: formations.data ?? [],
  };
}

export async function getTeamRanking(client: SupabaseClient, teamId: string) {
  const { data: current, error } = await client
    .from("team_rankings")
    .select("*")
    .eq("entity_id", teamId)
    .is("cycle_id", null)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!current) return { current: null, monthly: null, contributions: [] };
  const [monthly, contributions] = await Promise.all([
    client
      .from("team_rankings")
      .select("*")
      .eq("entity_id", teamId)
      .not("cycle_id", "is", null)
      .order("refreshed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    client
      .from("ranking_contributions")
      .select("athlete_id,athlete_code,athlete_name,points")
      .eq("ranking_type", "team")
      .eq("entity_id", teamId)
      .eq("season_id", current.season_id)
      .is("cycle_id", null)
      .order("points", { ascending: false }),
  ]);
  for (const response of [monthly, contributions])
    if (response.error) throw response.error;
  return {
    current,
    monthly: monthly.data,
    contributions: contributions.data ?? [],
  };
}

export async function getPublicAthlete(
  client: SupabaseClient,
  athleteCode: string,
) {
  const { data: ranking, error } = await client
    .from("public_rankings")
    .select("*")
    .eq("ranking_type", "individual")
    .eq("entity_code", athleteCode)
    .is("cycle_id", null)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return ranking
    ? {
        profile: {
          athlete_id: ranking.entity_id,
          athlete_code: ranking.entity_code,
          public_name: ranking.display_name,
          avatar_url: ranking.avatar_url
            ? (
                await client.storage
                  .from("athlete-avatars")
                  .createSignedUrl(ranking.avatar_url, 60 * 10)
              ).data?.signedUrl ?? null
            : null,
        },
        ranking,
      }
    : null;
}

async function withSignedRankingAvatars<T extends { avatar_url?: string | null }>(
  client: SupabaseClient,
  rows: T[],
) {
  const paths = rows
    .map((row) => row.avatar_url)
    .filter((value): value is string => Boolean(value));
  if (!paths.length) return rows;
  const uniquePaths = [...new Set(paths)];
  const { data } = await client.storage
    .from("athlete-avatars")
    .createSignedUrls(uniquePaths, 60 * 10);
  const signedByPath = new Map(
    (data ?? []).flatMap((item) =>
      item.path && item.signedUrl ? [[item.path, item.signedUrl] as const] : [],
    ),
  );
  return rows.map((row) => ({
    ...row,
    avatar_signed_url: row.avatar_url ? signedByPath.get(row.avatar_url) ?? null : null,
  }));
}
