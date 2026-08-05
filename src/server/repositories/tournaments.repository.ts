import type { SupabaseClient } from "@supabase/supabase-js";

type RegistrationRow = {
  teams?: unknown;
  team_rosters?: unknown;
  [key: string]: unknown;
};

type DivisionRow = {
  competitive_formats?: unknown;
  competitive_categories?: unknown;
  tournament_registrations?: RegistrationRow[] | null;
  [key: string]: unknown;
};

function first<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export async function listTournaments(client: SupabaseClient) {
  const { data, error } = await client
    .from("tournaments")
    .select(
      "id,name,product,status,starts_at,ends_at,public_slug,poles(name),tournament_divisions(id,level,status,format)",
    )
    .order("starts_at", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    poles: first(row.poles),
  }));
}

export async function listPublicTournaments(client: SupabaseClient) {
  const { data, error } = await client
    .from("public_tournaments")
    .select("*")
    .order("starts_at", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

export async function getTournament(client: SupabaseClient, id: string) {
  const { data, error } = await client
    .from("tournaments")
    .select(
      "*,poles(name),venues(name),tournament_divisions(*,competitive_formats(name,code),competitive_categories(name,code),tournament_registrations(*,teams(name),team_rosters(name),tournament_rosters(*,athletes(public_name,athlete_code))))",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    poles: first(data.poles),
    venues: first(data.venues),
    tournament_divisions: (
      (data.tournament_divisions ?? []) as DivisionRow[]
    ).map((division) => ({
      ...division,
      competitive_formats: first(division.competitive_formats),
      competitive_categories: first(division.competitive_categories),
      tournament_registrations: (division.tournament_registrations ?? []).map(
        (registration) => ({
          ...registration,
          teams: first(registration.teams),
          team_rosters: first(registration.team_rosters),
        }),
      ),
    })),
  };
}

export async function getPublicTournament(
  client: SupabaseClient,
  slug: string,
) {
  const { data, error } = await client
    .from("public_tournaments")
    .select("*")
    .eq("public_slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listAthleteCompetitions(
  client: SupabaseClient,
  athleteId: string,
) {
  const { data, error } = await client
    .from("tournament_rosters")
    .select(
      "id,role,eligibility_status,eligibility_reasons,tournament_registrations(status,payment_status,tournament_divisions(id,level,format,tournaments(id,name,product,status,starts_at,public_slug)))",
    )
    .eq("athlete_id", athleteId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const registration = first(row.tournament_registrations);
    const division = first(registration?.tournament_divisions);
    return {
      ...row,
      tournament_registrations: registration
        ? {
            ...registration,
            tournament_divisions: division
              ? {
                  ...division,
                  tournaments: first(division.tournaments),
                }
              : null,
          }
        : null,
    };
  });
}
