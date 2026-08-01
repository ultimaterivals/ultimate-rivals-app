import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CreateAthlete360Input,
  UpdateOwnAthleteProfileInput,
} from "@/lib/validation/athlete";

const privateColumns =
  "id,athlete_code,profile_id,public_name,full_name,birth_date,gender,dominant_hand,height_cm,phone,email_contact,instagram_handle,city,state,bio,avatar_url,status,created_at,updated_at,archived_at";
export interface AthleteSearch {
  query?: string;
  status?: string;
  gender?: string;
  account?: string;
  level?: string;
  poleId?: string;
  teamId?: string;
  page: number;
  pageSize: number;
  sort?: string;
}
export async function searchAthletes(
  client: SupabaseClient,
  filters: AthleteSearch,
) {
  const scopes: Set<string>[] = [];
  if (filters.level) {
    const { data, error } = await client
      .from("athlete_levels")
      .select("athlete_id")
      .eq("level", filters.level)
      .eq("status", "active");
    if (error) throw error;
    scopes.push(new Set((data ?? []).map((row) => row.athlete_id)));
  }
  if (filters.teamId) {
    const { data, error } = await client
      .from("team_memberships")
      .select("athlete_id")
      .eq("team_id", filters.teamId)
      .eq("status", "active");
    if (error) throw error;
    scopes.push(new Set((data ?? []).map((row) => row.athlete_id)));
  }
  if (filters.poleId) {
    const { data: teams, error: teamError } = await client
      .from("teams")
      .select("id")
      .eq("primary_pole_id", filters.poleId);
    if (teamError) throw teamError;
    const teamIds = (teams ?? []).map((row) => row.id);
    if (!teamIds.length) scopes.push(new Set());
    else {
      const { data, error } = await client
        .from("team_memberships")
        .select("athlete_id")
        .in("team_id", teamIds)
        .eq("status", "active");
      if (error) throw error;
      scopes.push(new Set((data ?? []).map((row) => row.athlete_id)));
    }
  }
  let query = client
    .from("athletes")
    .select(privateColumns, { count: "exact" });
  if (scopes.length) {
    const ids = [...scopes[0]!].filter((id) =>
      scopes.every((scope) => scope.has(id)),
    );
    if (!ids.length) return { rows: [], count: 0 };
    query = query.in("id", ids);
  }
  if (filters.query) {
    const safe = filters.query.replace(/[%_,()]/g, "");
    query = query.or(
      `athlete_code.ilike.%${safe}%,public_name.ilike.%${safe}%,full_name.ilike.%${safe}%`,
    );
  }
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.gender) query = query.eq("gender", filters.gender);
  if (filters.account === "yes") query = query.not("profile_id", "is", null);
  if (filters.account === "no") query = query.is("profile_id", null);
  const sort =
    filters.sort === "created"
      ? "created_at"
      : filters.sort === "code"
        ? "athlete_code"
        : filters.sort === "status"
          ? "status"
          : "public_name";
  const from = (filters.page - 1) * filters.pageSize;
  const { data, error, count } = await query
    .order(sort)
    .range(from, from + filters.pageSize - 1);
  if (error) throw error;
  return { rows: data ?? [], count: count ?? 0 };
}
export async function getAthletePrivateView(
  client: SupabaseClient,
  id: string,
) {
  const { data, error } = await client
    .from("athletes")
    .select(privateColumns)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}
export async function getAthletePublicView(client: SupabaseClient, id: string) {
  const { data, error } = await client
    .from("athletes")
    .select(
      "id,athlete_code,public_name,avatar_url,bio,height_cm,dominant_hand,city,state,status",
    )
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}
export async function getAthleteHistory(client: SupabaseClient, id: string) {
  const [levels, memberships, notes, audit] = await Promise.all([
    client
      .from("athlete_levels")
      .select(
        "id,level,status,starts_at,ends_at,reason,assigned_by,seasons(name)",
      )
      .eq("athlete_id", id)
      .order("starts_at", { ascending: false }),
    client
      .from("team_memberships")
      .select(
        "id,membership_type,status,starts_at,ends_at,teams(name,poles(name)),seasons(name)",
      )
      .eq("athlete_id", id)
      .order("starts_at", { ascending: false }),
    client
      .from("athlete_notes")
      .select("id,note_type,content,visibility,created_at,author_user_id")
      .eq("athlete_id", id)
      .order("created_at", { ascending: false }),
    client
      .from("audit_logs")
      .select("id,action,created_at,actor_user_id")
      .eq("entity_id", id)
      .order("created_at", { ascending: false })
      .limit(25),
  ]);
  for (const result of [levels, memberships, notes, audit])
    if (result.error) throw result.error;
  return {
    levels: levels.data ?? [],
    memberships: memberships.data ?? [],
    notes: notes.data ?? [],
    audit: audit.data ?? [],
  };
}
export async function insertAthlete360(
  client: SupabaseClient,
  input: CreateAthlete360Input,
) {
  const { data, error } = await client
    .from("athletes")
    .insert(mapInput(input))
    .select(privateColumns)
    .single();
  if (error) throw error;
  return data;
}
export async function updateOwnAthlete(
  client: SupabaseClient,
  input: UpdateOwnAthleteProfileInput,
) {
  const { data, error } = await client
    .from("athletes")
    .update(mapInput(input))
    .eq("id", input.athleteId)
    .select(privateColumns)
    .single();
  if (error) throw error;
  return data;
}
function mapInput(
  input: Partial<CreateAthlete360Input & UpdateOwnAthleteProfileInput>,
) {
  return {
    public_name: input.publicName,
    full_name: "fullName" in input ? input.fullName : undefined,
    birth_date: "birthDate" in input ? input.birthDate : undefined,
    gender: "gender" in input ? input.gender : undefined,
    dominant_hand: input.dominantHand,
    height_cm: input.heightCm,
    phone: input.phone,
    email_contact: input.emailContact,
    instagram_handle: input.instagramHandle,
    city: input.city,
    state: input.state,
    bio: input.bio,
    profile_id: "profileId" in input ? input.profileId : undefined,
    duplicate_override_reason:
      "duplicateOverrideReason" in input
        ? input.duplicateOverrideReason
        : undefined,
  };
}
