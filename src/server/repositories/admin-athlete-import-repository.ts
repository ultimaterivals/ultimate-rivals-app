import { createClient } from "@/lib/supabase/server";

export type RawAthleteImportBatch = {
  id: string;
  source_type: string;
  source_ref: string;
  source_version: string | null;
  status: string;
  total_rows: number;
  ready_rows: number;
  review_rows: number;
  blocked_rows: number;
  imported_rows: number;
  created_at: string;
};

export type RawAthleteImportIssue = {
  severity?: string;
  code?: string;
  detail?: string;
};

export type RawAthleteImportRow = {
  id: string;
  batch_id: string;
  source_row: number;
  legacy_id: string | null;
  full_name: string;
  public_name: string | null;
  birth_date: string | null;
  phone: string | null;
  email: string | null;
  pole_text: string | null;
  categories_text: string | null;
  days_text: string | null;
  shifts_text: string | null;
  team_text: string | null;
  experience_text: string | null;
  legacy_status: string | null;
  legacy_level: string | null;
  legacy_categories_text: string | null;
  active_candidate: boolean;
  validation_status: string;
  issues: RawAthleteImportIssue[] | null;
  review_resolution: Record<string, unknown> | null;
  imported_athlete_id: string | null;
  reviewed_at: string | null;
};

export type RawImportPole = {
  id: string;
  name: string;
  city: string;
  status: string;
};

export async function fetchAdminAthleteImportData() {
  const supabase = await createClient();
  const errors: string[] = [];
  const [batchesResult, rowsResult, polesResult] = await Promise.all([
    supabase
      .from("athlete_import_batches")
      .select(
        "id,source_type,source_ref,source_version,status,total_rows,ready_rows,review_rows,blocked_rows,imported_rows,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("athlete_import_rows")
      .select(
        "id,batch_id,source_row,legacy_id,full_name,public_name,birth_date,phone,email,pole_text,categories_text,days_text,shifts_text,team_text,experience_text,legacy_status,legacy_level,legacy_categories_text,active_candidate,validation_status,issues,review_resolution,imported_athlete_id,reviewed_at",
      )
      .order("source_row", { ascending: true })
      .limit(5000),
    supabase
      .from("poles")
      .select("id,name,city,status")
      .order("name", { ascending: true }),
  ]);

  if (batchesResult.error) errors.push(`athlete_import_batches: ${batchesResult.error.message}`);
  if (rowsResult.error) errors.push(`athlete_import_rows: ${rowsResult.error.message}`);
  if (polesResult.error) errors.push(`poles: ${polesResult.error.message}`);

  return {
    batches: batchesResult.error
      ? null
      : ((batchesResult.data as RawAthleteImportBatch[] | null) ?? []),
    rows: rowsResult.error
      ? null
      : ((rowsResult.data as RawAthleteImportRow[] | null) ?? []),
    poles: polesResult.error
      ? null
      : ((polesResult.data as RawImportPole[] | null) ?? []),
    errors,
  };
}
