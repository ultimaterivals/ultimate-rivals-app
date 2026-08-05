import type { SupabaseClient } from "@supabase/supabase-js";

export async function listPrizeRepassOperations(client: SupabaseClient) {
  const [templates, templateAllocations, repassPlans, repassAllocations, ops] =
    await Promise.all([
      client
        .from("tournament_prize_plan_templates")
        .select("*")
        .order("product"),
      client
        .from("tournament_prize_template_allocations")
        .select("*,tournament_prize_plan_templates(code,name,product)")
        .order("sort_order"),
      client
        .from("season_repass_plans")
        .select("*")
        .order("created_at", { ascending: false }),
      client
        .from("season_repass_allocations")
        .select("*")
        .order("rank_position"),
      client
        .from("admin_prize_repass_operations")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

  for (const response of [
    templates,
    templateAllocations,
    repassPlans,
    repassAllocations,
    ops,
  ]) {
    if (response.error) throw response.error;
  }

  return {
    templates: templates.data ?? [],
    templateAllocations: templateAllocations.data ?? [],
    repassPlans: repassPlans.data ?? [],
    repassAllocations: repassAllocations.data ?? [],
    operations: ops.data ?? [],
  };
}

export async function listFinanceOperations(client: SupabaseClient) {
  const [
    revenues,
    expenses,
    eventSummaries,
    venueSummaries,
    sponsorSummaries,
    prizeObligations,
    repassObligations,
  ] = await Promise.all([
    client
      .from("revenue_entries")
      .select("*")
      .order("created_at", { ascending: false }),
    client
      .from("expense_entries")
      .select("*")
      .order("created_at", { ascending: false }),
    client.from("event_financial_summaries").select("*").limit(25),
    client.from("venue_financial_summaries").select("*").limit(25),
    client.from("sponsor_financial_summaries").select("*").limit(25),
    client.from("prize_obligations").select("*").limit(25),
    client.from("repass_obligations").select("*").limit(25),
  ]);

  for (const response of [
    revenues,
    expenses,
    eventSummaries,
    venueSummaries,
    sponsorSummaries,
    prizeObligations,
    repassObligations,
  ]) {
    if (response.error) throw response.error;
  }

  return {
    revenues: revenues.data ?? [],
    expenses: expenses.data ?? [],
    eventSummaries: eventSummaries.data ?? [],
    venueSummaries: venueSummaries.data ?? [],
    sponsorSummaries: sponsorSummaries.data ?? [],
    prizeObligations: prizeObligations.data ?? [],
    repassObligations: repassObligations.data ?? [],
  };
}
