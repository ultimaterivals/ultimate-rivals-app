import { createClient } from "@/lib/supabase/server";

export type RawHomologationAthlete = {
  id: string;
  athlete_code: string;
  public_name: string;
  full_name: string;
  birth_date: string | null;
  phone: string | null;
  email_contact: string | null;
  primary_pole_id: string | null;
  profile_id: string | null;
  status: string;
};

export type RawHomologationPole = {
  id: string;
  name: string;
  city: string;
  status: string;
};

export async function fetchAdminAthleteHomologationData() {
  const supabase = await createClient();
  const errors: string[] = [];
  const [athletesResult, polesResult] = await Promise.all([
    supabase
      .from("athletes")
      .select(
        "id,athlete_code,public_name,full_name,birth_date,phone,email_contact,primary_pole_id,profile_id,status",
      )
      .order("athlete_code", { ascending: true }),
    supabase
      .from("poles")
      .select("id,name,city,status")
      .order("name", { ascending: true }),
  ]);

  if (athletesResult.error)
    errors.push(`athletes: ${athletesResult.error.message}`);
  if (polesResult.error) errors.push(`poles: ${polesResult.error.message}`);

  return {
    athletes: athletesResult.error
      ? null
      : ((athletesResult.data as RawHomologationAthlete[] | null) ?? []),
    poles: polesResult.error
      ? null
      : ((polesResult.data as RawHomologationPole[] | null) ?? []),
    errors,
  };
}
