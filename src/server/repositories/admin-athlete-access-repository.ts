import { createClient } from "@/lib/supabase/server";

export type RawAccessAthlete = {
  id: string;
  public_name: string;
  athlete_code: string;
  email_contact: string | null;
  phone: string | null;
  profile_id: string | null;
};

export type RawAccessInvite = {
  id: string;
  athlete_id: string;
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export async function fetchAdminAthleteAccessRepositoryData() {
  const supabase = await createClient();
  const errors: string[] = [];
  const [athletesResult, invitesResult] = await Promise.all([
    supabase
      .from("athletes")
      .select("id,public_name,athlete_code,email_contact,phone,profile_id")
      .eq("status", "active")
      .order("public_name", { ascending: true })
      .limit(5000),
    supabase
      .from("athlete_access_invites")
      .select("id,athlete_id,expires_at,used_at,revoked_at,created_at")
      .order("created_at", { ascending: false })
      .limit(5000),
  ]);

  if (athletesResult.error) {
    errors.push(`athletes: ${athletesResult.error.message}`);
  }
  if (invitesResult.error) {
    errors.push(`athlete_access_invites: ${invitesResult.error.message}`);
  }

  return {
    athletes: athletesResult.error
      ? null
      : ((athletesResult.data as RawAccessAthlete[] | null) ?? []),
    invites: invitesResult.error
      ? null
      : ((invitesResult.data as RawAccessInvite[] | null) ?? []),
    errors,
  };
}
