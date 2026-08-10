import { createClient } from "@/lib/supabase/server";

export type RawActivationWave = {
  id: string;
  name: string;
  target_size: number;
  pole_id: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type RawActivationWaveMember = {
  wave_id: string;
  athlete_id: string;
  selection_reason: string;
  priority: number;
  selected_at: string;
  removed_at: string | null;
};

export type RawWaveAthlete = {
  id: string;
  gender: string;
};

export type RawWaveInvite = {
  athlete_id: string;
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export type RawWaveAvailability = {
  athlete_id: string;
  active: boolean;
  valid_from: string;
  valid_until: string | null;
};

export type RawWaveImportRow = {
  imported_athlete_id: string | null;
  source_row: number;
  validation_status: string;
};

export async function fetchAdminAthleteWavesRepositoryData() {
  const supabase = await createClient();
  const errors: string[] = [];
  const [
    wavesResult,
    membersResult,
    athleteResult,
    invitesResult,
    availabilityResult,
    importRowsResult,
  ] = await Promise.all([
    supabase
      .from("athlete_activation_waves")
      .select("id,name,target_size,pole_id,status,notes,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("athlete_activation_wave_members")
      .select(
        "wave_id,athlete_id,selection_reason,priority,selected_at,removed_at",
      )
      .order("priority", { ascending: false })
      .order("selected_at", { ascending: true })
      .limit(10000),
    supabase.from("athletes").select("id,gender").limit(10000),
    supabase
      .from("athlete_access_invites")
      .select("athlete_id,expires_at,used_at,revoked_at,created_at")
      .order("created_at", { ascending: false })
      .limit(10000),
    supabase
      .from("athlete_availability_windows")
      .select("athlete_id,active,valid_from,valid_until")
      .limit(20000),
    supabase
      .from("athlete_import_rows")
      .select("imported_athlete_id,source_row,validation_status")
      .not("imported_athlete_id", "is", null)
      .limit(10000),
  ]);

  const sources = [
    ["athlete_activation_waves", wavesResult.error],
    ["athlete_activation_wave_members", membersResult.error],
    ["athletes.gender", athleteResult.error],
    ["athlete_access_invites", invitesResult.error],
    ["athlete_availability_windows", availabilityResult.error],
    ["athlete_import_rows", importRowsResult.error],
  ] as const;
  for (const [source, error] of sources) {
    if (error) errors.push(`${source}: ${error.message}`);
  }

  return {
    waves: wavesResult.error
      ? null
      : ((wavesResult.data as RawActivationWave[] | null) ?? []),
    members: membersResult.error
      ? null
      : ((membersResult.data as RawActivationWaveMember[] | null) ?? []),
    athletes: athleteResult.error
      ? null
      : ((athleteResult.data as RawWaveAthlete[] | null) ?? []),
    invites: invitesResult.error
      ? null
      : ((invitesResult.data as RawWaveInvite[] | null) ?? []),
    availability: availabilityResult.error
      ? null
      : ((availabilityResult.data as RawWaveAvailability[] | null) ?? []),
    importRows: importRowsResult.error
      ? null
      : ((importRowsResult.data as RawWaveImportRow[] | null) ?? []),
    errors,
  };
}
