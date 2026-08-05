import type { SupabaseClient } from "@supabase/supabase-js";

export type CalendarFilters = {
  poleId?: string;
  eventType?: string;
  status?: string;
  from?: string;
  to?: string;
};

export async function listCalendarOperations(
  client: SupabaseClient,
  filters: CalendarFilters = {},
) {
  let query = client
    .from("admin_calendar_operations")
    .select("*")
    .order("starts_at", { ascending: true });
  if (filters.poleId) query = query.eq("pole_id", filters.poleId);
  if (filters.eventType) query = query.eq("event_type", filters.eventType);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.from) query = query.gte("starts_at", filters.from);
  if (filters.to) query = query.lte("starts_at", filters.to);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listCalendarReferenceData(client: SupabaseClient) {
  const [
    { data: poles, error: polesError },
    { data: templates, error: templatesError },
    { data: conflicts, error: conflictsError },
  ] = await Promise.all([
    client.from("poles").select("id,name").order("name"),
    client
      .from("calendar_q1_templates")
      .select(
        "id,name,weekday,starts_at,ends_at,event_type,competition_mode,target_courts,alternates_friday,poles(name)",
      )
      .order("weekday")
      .order("starts_at"),
    client
      .from("calendar_event_conflicts")
      .select("conflict_type,calendar_event_id,conflicting_event_id,detail")
      .limit(50),
  ]);
  if (polesError) throw polesError;
  if (templatesError) throw templatesError;
  if (conflictsError) throw conflictsError;
  return {
    poles: poles ?? [],
    templates: templates ?? [],
    conflicts: conflicts ?? [],
  };
}
