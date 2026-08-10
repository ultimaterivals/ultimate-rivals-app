import { createClient } from "@/lib/supabase/server";

export type RawAgendaPole = {
  id: string;
  name: string;
  slug: string;
  city: string;
  status: string;
};

export type RawAgendaEvent = {
  id: string;
  name: string;
  event_type: string;
  status: string;
  starts_at: string;
  ends_at: string;
  pole_id: string | null;
  pole_name: string | null;
  venue_name: string | null;
  open_checklist_items: number | null;
  conflict_count: number | null;
};

export type RawAgendaDemand = {
  id: string;
  calendar_event_id: string | null;
  title: string;
  status: string;
  demand_signal: string | null;
  starts_at: string | null;
  ends_at: string | null;
  pole_id: string | null;
  pole_name: string | null;
  venue_name: string | null;
  level: string | null;
  format_code: string | null;
  category_code: string | null;
  interested_count: number | null;
  ready_formations: number | null;
  target_formations: number;
  reserved_count: number | null;
  waitlist_count: number | null;
  remaining_capacity: number | null;
};

export type RawAgendaAvailability = {
  id: string;
  athlete_id: string;
  day_of_week: number;
  starts_at: string;
  ends_at: string;
  pole_id: string | null;
  modality: string;
  format_codes: string[];
  category_codes: string[];
  valid_from: string | null;
  valid_until: string | null;
  active: boolean;
};

export type AdminAgendaRepositoryData = {
  poles: RawAgendaPole[] | null;
  events: RawAgendaEvent[] | null;
  demand: RawAgendaDemand[] | null;
  availability: RawAgendaAvailability[] | null;
  errors: string[];
};

function pushError(errors: string[], source: string, message: string) {
  errors.push(`${source}: ${message}`);
}

export async function fetchAdminAgendaRepositoryData({
  rangeStartIso,
  rangeEndIso,
}: {
  rangeStartIso: string;
  rangeEndIso: string;
}): Promise<AdminAgendaRepositoryData> {
  const supabase = await createClient();
  const errors: string[] = [];

  const [polesResult, calendarResult, demandResult, availabilityResult] =
    await Promise.all([
      supabase
        .from("poles")
        .select("id,name,slug,city,status")
        .order("name", { ascending: true }),
      supabase
        .from("admin_calendar_operations")
        .select(
          "id,name,event_type,status,starts_at,ends_at,pole_id,pole_name,venue_name,open_checklist_items,conflict_count",
        )
        .gte("starts_at", rangeStartIso)
        .lt("starts_at", rangeEndIso)
        .neq("status", "cancelled")
        .order("starts_at", { ascending: true }),
      supabase
        .from("admin_demand_dashboard")
        .select(
          "id,calendar_event_id,title,status,demand_signal,starts_at,ends_at,pole_id,pole_name,venue_name,level,format_code,category_code,interested_count,ready_formations,target_formations,reserved_count,waitlist_count,remaining_capacity",
        )
        .gte("starts_at", rangeStartIso)
        .lt("starts_at", rangeEndIso)
        .order("starts_at", { ascending: true }),
      supabase
        .from("athlete_availability_windows")
        .select(
          "id,athlete_id,day_of_week,starts_at,ends_at,pole_id,modality,format_codes,category_codes,valid_from,valid_until,active",
        )
        .eq("active", true)
        .limit(10000),
    ]);

  if (polesResult.error) {
    pushError(errors, "poles", polesResult.error.message);
  }
  if (calendarResult.error) {
    pushError(
      errors,
      "admin_calendar_operations",
      calendarResult.error.message,
    );
  }
  if (demandResult.error) {
    pushError(errors, "admin_demand_dashboard", demandResult.error.message);
  }
  if (availabilityResult.error) {
    pushError(
      errors,
      "athlete_availability_windows",
      availabilityResult.error.message,
    );
  }

  return {
    poles: polesResult.error
      ? null
      : ((polesResult.data as RawAgendaPole[] | null) ?? []),
    events: calendarResult.error
      ? null
      : ((calendarResult.data as RawAgendaEvent[] | null) ?? []),
    demand: demandResult.error
      ? null
      : ((demandResult.data as RawAgendaDemand[] | null) ?? []),
    availability: availabilityResult.error
      ? null
      : ((availabilityResult.data as RawAgendaAvailability[] | null) ?? []),
    errors,
  };
}
