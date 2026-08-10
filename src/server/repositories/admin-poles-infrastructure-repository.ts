import { createClient } from "@/lib/supabase/server";

export type RawPoleInfrastructurePole = {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  status: string;
};

export type RawPoleInfrastructureVenue = {
  id: string;
  pole_id: string;
  name: string;
  city: string;
  status: string;
};

export type RawPoleInfrastructureCourt = {
  id: string;
  venue_id: string;
  name: string;
  status: string;
};

export async function fetchAdminPolesInfrastructureData() {
  const supabase = await createClient();
  const errors: string[] = [];
  const [polesResult, venuesResult, courtsResult] = await Promise.all([
    supabase
      .from("poles")
      .select("id,name,slug,city,state,status")
      .order("name", { ascending: true }),
    supabase
      .from("venues")
      .select("id,pole_id,name,city,status")
      .order("name", { ascending: true }),
    supabase
      .from("courts")
      .select("id,venue_id,name,status")
      .order("name", { ascending: true }),
  ]);

  if (polesResult.error) errors.push(`poles: ${polesResult.error.message}`);
  if (venuesResult.error) errors.push(`venues: ${venuesResult.error.message}`);
  if (courtsResult.error) errors.push(`courts: ${courtsResult.error.message}`);

  return {
    poles: polesResult.error
      ? null
      : ((polesResult.data as RawPoleInfrastructurePole[] | null) ?? []),
    venues: venuesResult.error
      ? null
      : ((venuesResult.data as RawPoleInfrastructureVenue[] | null) ?? []),
    courts: courtsResult.error
      ? null
      : ((courtsResult.data as RawPoleInfrastructureCourt[] | null) ?? []),
    errors,
  };
}
