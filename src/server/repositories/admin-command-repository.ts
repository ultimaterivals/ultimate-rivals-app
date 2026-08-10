import { createClient } from "@/lib/supabase/server";

export type RawCommandSeason = {
  id: string;
  name: string;
  code: string;
  status: string;
  starts_at: string;
  ends_at: string;
};

export type RawSeasonSummary = {
  season_id: string;
  name: string;
  active_athletes: number;
  ur_play_sessions: number;
  training_sessions: number;
  matches: number;
  tournaments: number;
  revenue: number | string;
  expenses: number | string;
};

export type RawCalendarOperation = {
  id: string;
  name: string;
  event_type: string;
  status: string;
  starts_at: string;
  ends_at: string;
  pole_name: string | null;
  venue_name: string | null;
  open_checklist_items: number | null;
  conflict_count: number | null;
};

export type RawDemandOperation = {
  id: string;
  title: string;
  status: string;
  demand_signal: string | null;
  starts_at: string | null;
  ends_at: string | null;
  pole_name: string | null;
  venue_name: string | null;
  interested_count: number | null;
  ready_formations: number | null;
  target_formations: number;
  reserved_count: number | null;
  waitlist_count: number | null;
  remaining_capacity: number | null;
};

export type RawAcquisitionRow = {
  visitors: number | null;
  signups: number | null;
  interests: number | null;
  reservations: number | null;
  first_participation: number | null;
  second_participation: number | null;
  returning: number | null;
};

export type RawPaymentOperation = {
  id: string;
  amount: number | string;
  status: string;
  due_at: string | null;
};

export type RawObligation = {
  obligation_type: string;
  allocation_id: string;
  status: string;
  amount: number | string;
};

export type AdminCommandRepositoryData = {
  season: RawCommandSeason | null;
  summary: RawSeasonSummary | null;
  calendar: RawCalendarOperation[] | null;
  demand: RawDemandOperation[] | null;
  activeAthletes30d: number | null;
  firstParticipationOnly: number | null;
  acquisition: RawAcquisitionRow[] | null;
  overduePayments: RawPaymentOperation[] | null;
  obligations: RawObligation[] | null;
  errors: string[];
};

function pushError(errors: string[], source: string, message: string) {
  errors.push(`${source}: ${message}`);
}

export async function fetchAdminCommandRepositoryData(
  now: Date,
): Promise<AdminCommandRepositoryData> {
  const supabase = await createClient();
  const errors: string[] = [];
  const nowIso = now.toISOString();
  const sevenDaysIso = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const preferredSeason = await supabase
    .from("seasons")
    .select("id,name,code,status,starts_at,ends_at")
    .in("status", ["registration", "active", "closing"])
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (preferredSeason.error) {
    pushError(errors, "seasons", preferredSeason.error.message);
  }

  let season = (preferredSeason.data as RawCommandSeason | null) ?? null;

  if (!season && !preferredSeason.error) {
    const latestSeason = await supabase
      .from("seasons")
      .select("id,name,code,status,starts_at,ends_at")
      .neq("status", "archived")
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestSeason.error) {
      pushError(errors, "seasons.latest", latestSeason.error.message);
    } else {
      season = (latestSeason.data as RawCommandSeason | null) ?? null;
    }
  }

  const [
    calendarResult,
    demandResult,
    activeResult,
    firstOnlyResult,
    acquisitionResult,
    paymentResult,
    obligationResult,
  ] = await Promise.all([
    supabase
      .from("admin_calendar_operations")
      .select(
        "id,name,event_type,status,starts_at,ends_at,pole_name,venue_name,open_checklist_items,conflict_count",
      )
      .gte("starts_at", nowIso)
      .lt("starts_at", sevenDaysIso)
      .neq("status", "cancelled")
      .order("starts_at", { ascending: true })
      .limit(30),
    supabase
      .from("admin_demand_dashboard")
      .select(
        "id,title,status,demand_signal,starts_at,ends_at,pole_name,venue_name,interested_count,ready_formations,target_formations,reserved_count,waitlist_count,remaining_capacity",
      )
      .order("updated_at", { ascending: false })
      .limit(12),
    supabase
      .from("admin_athlete_engagement")
      .select("athlete_id", { count: "exact", head: true })
      .eq("active_30d", true),
    supabase
      .from("admin_athlete_engagement")
      .select("athlete_id", { count: "exact", head: true })
      .not("first_participation_at", "is", null)
      .is("second_participation_at", null),
    supabase
      .from("admin_acquisition_dashboard")
      .select(
        "visitors,signups,interests,reservations,first_participation,second_participation,returning",
      ),
    supabase
      .from("admin_payment_operations")
      .select("id,amount,status,due_at")
      .in("status", ["pending", "submitted"])
      .lt("due_at", nowIso),
    supabase
      .from("admin_prize_repass_operations")
      .select("obligation_type,allocation_id,status,amount")
      .not("status", "in", "(paid,void)"),
  ]);

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
  if (activeResult.error) {
    pushError(
      errors,
      "admin_athlete_engagement.active",
      activeResult.error.message,
    );
  }
  if (firstOnlyResult.error) {
    pushError(
      errors,
      "admin_athlete_engagement.first_only",
      firstOnlyResult.error.message,
    );
  }
  if (acquisitionResult.error) {
    pushError(
      errors,
      "admin_acquisition_dashboard",
      acquisitionResult.error.message,
    );
  }
  if (paymentResult.error) {
    pushError(errors, "admin_payment_operations", paymentResult.error.message);
  }
  if (obligationResult.error) {
    pushError(
      errors,
      "admin_prize_repass_operations",
      obligationResult.error.message,
    );
  }

  let summary: RawSeasonSummary | null = null;
  if (season) {
    const summaryResult = await supabase
      .from("season_executive_report_summary")
      .select(
        "season_id,name,active_athletes,ur_play_sessions,training_sessions,matches,tournaments,revenue,expenses",
      )
      .eq("season_id", season.id)
      .maybeSingle();

    if (summaryResult.error) {
      pushError(
        errors,
        "season_executive_report_summary",
        summaryResult.error.message,
      );
    } else {
      summary = (summaryResult.data as RawSeasonSummary | null) ?? null;
    }
  }

  return {
    season,
    summary,
    calendar: calendarResult.error
      ? null
      : ((calendarResult.data as RawCalendarOperation[] | null) ?? []),
    demand: demandResult.error
      ? null
      : ((demandResult.data as RawDemandOperation[] | null) ?? []),
    activeAthletes30d: activeResult.error ? null : (activeResult.count ?? 0),
    firstParticipationOnly: firstOnlyResult.error
      ? null
      : (firstOnlyResult.count ?? 0),
    acquisition: acquisitionResult.error
      ? null
      : ((acquisitionResult.data as RawAcquisitionRow[] | null) ?? []),
    overduePayments: paymentResult.error
      ? null
      : ((paymentResult.data as RawPaymentOperation[] | null) ?? []),
    obligations: obligationResult.error
      ? null
      : ((obligationResult.data as RawObligation[] | null) ?? []),
    errors,
  };
}
