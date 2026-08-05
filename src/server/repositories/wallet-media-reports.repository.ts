import type { SupabaseClient } from "@supabase/supabase-js";

async function countRows(client: SupabaseClient, table: string) {
  const { count, error } = await client
    .from(table)
    .select("id", { count: "exact", head: true });
  if (error) return 0;
  return count ?? 0;
}

export async function getAthleteWallet(
  client: SupabaseClient,
  athleteId: string,
) {
  const [projection, transactions, activeRules] = await Promise.all([
    client
      .from("ur_coin_wallet_projection")
      .select("*")
      .eq("athlete_id", athleteId)
      .maybeSingle(),
    client
      .from("ur_coin_transactions")
      .select("*,ur_coin_rules(name,code)")
      .eq("athlete_id", athleteId)
      .order("created_at", { ascending: false }),
    client
      .from("ur_coin_rules")
      .select("code,name,amount,direction,source_type,status")
      .eq("status", "active")
      .order("code"),
  ]);

  if (projection.error) throw projection.error;
  if (transactions.error) throw transactions.error;
  if (activeRules.error) throw activeRules.error;

  return {
    projection: projection.data,
    transactions: transactions.data ?? [],
    activeRules: activeRules.data ?? [],
  };
}

export async function listMediaOperations(client: SupabaseClient) {
  const [assets, links, annotations, highlights, suggestions] =
    await Promise.all([
      client
        .from("media_assets")
        .select(
          "*,athletes(public_name,athlete_code),teams(name),venues(name),poles(name)",
        )
        .order("created_at", { ascending: false }),
      client
        .from("match_media_links")
        .select("*,matches(id,status),media_assets(title,asset_type,status)")
        .order("created_at", { ascending: false }),
      client
        .from("video_annotations")
        .select("*,media_assets(title),athletes(public_name)")
        .order("created_at", { ascending: false }),
      client
        .from("highlight_clips")
        .select("*,media_assets(title),athletes(public_name),teams(name)")
        .order("created_at", { ascending: false }),
      client
        .from("analysis_suggestions")
        .select("*,media_assets(title),athletes(public_name)")
        .order("created_at", { ascending: false }),
    ]);

  for (const response of [
    assets,
    links,
    annotations,
    highlights,
    suggestions,
  ]) {
    if (response.error) throw response.error;
  }

  return {
    assets: assets.data ?? [],
    links: links.data ?? [],
    annotations: annotations.data ?? [],
    highlights: highlights.data ?? [],
    suggestions: suggestions.data ?? [],
  };
}

export async function listReportOperations(client: SupabaseClient) {
  const [
    athleteReports,
    teamReports,
    venueReports,
    sponsorReports,
    seasonReports,
  ] = await Promise.all([
    client.from("athlete_report_summary").select("*").limit(20),
    client.from("team_report_summary").select("*").limit(20),
    client.from("venue_report_summary").select("*").limit(20),
    client.from("sponsor_report_summary").select("*").limit(20),
    client.from("season_executive_report_summary").select("*").limit(20),
  ]);

  for (const response of [
    athleteReports,
    teamReports,
    venueReports,
    sponsorReports,
    seasonReports,
  ]) {
    if (response.error) throw response.error;
  }

  return {
    athleteReports: athleteReports.data ?? [],
    teamReports: teamReports.data ?? [],
    venueReports: venueReports.data ?? [],
    sponsorReports: sponsorReports.data ?? [],
    seasonReports: seasonReports.data ?? [],
  };
}

export async function getAdminCommandCenter(client: SupabaseClient) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const [
    sessionsToday,
    trainingToday,
    matchesToday,
    activeAthletes,
    pendingPayments,
    pendingDeliveries,
    marketRedemptions,
    financeObligations,
    reportOperations,
  ] = await Promise.all([
    client
      .from("ur_play_sessions")
      .select("id", { count: "exact", head: true })
      .gte("starts_at", today.toISOString())
      .lt("starts_at", tomorrow.toISOString()),
    client
      .from("training_sessions")
      .select("id", { count: "exact", head: true })
      .gte("starts_at", today.toISOString())
      .lt("starts_at", tomorrow.toISOString()),
    client
      .from("matches")
      .select("id", { count: "exact", head: true })
      .in("status", ["queued", "called", "in_progress", "pending_review"]),
    client
      .from("athletes")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    client
      .from("payment_records")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "submitted", "under_review"]),
    client
      .from("sponsorship_deliveries")
      .select("id", { count: "exact", head: true })
      .in("status", ["planned"]),
    client
      .from("market_redemptions")
      .select("id", { count: "exact", head: true })
      .in("status", ["reserved", "available"]),
    client
      .from("financial_obligations")
      .select("id", { count: "exact", head: true })
      .in("status", ["projected", "approved", "announced"]),
    listReportOperations(client),
  ]);

  const safeCount = (response: { count: number | null; error: unknown }) =>
    response.error ? 0 : (response.count ?? 0);

  return {
    today: {
      sessions: safeCount(sessionsToday),
      training: safeCount(trainingToday),
      matches: safeCount(matchesToday),
      staff: await countRows(client, "staff_assignments"),
    },
    pending: {
      payments: safeCount(pendingPayments),
      sponsorDeliveries: safeCount(pendingDeliveries),
      marketRedemptions: safeCount(marketRedemptions),
      financeObligations: safeCount(financeObligations),
    },
    season: {
      activeAthletes: safeCount(activeAthletes),
      reports: reportOperations.seasonReports.length,
      teamReports: reportOperations.teamReports.length,
      venueReports: reportOperations.venueReports.length,
      sponsorReports: reportOperations.sponsorReports.length,
    },
  };
}
