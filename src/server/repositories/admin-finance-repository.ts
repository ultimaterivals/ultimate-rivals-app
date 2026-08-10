import { createClient } from "@/lib/supabase/server";

export type RawPaymentOperation = {
  id: string;
  description: string;
  amount: number | string;
  status: string;
  due_at: string | null;
  athlete_name: string | null;
  team_name: string | null;
  product_name: string | null;
  package_name: string | null;
  paid_amount: number | string | null;
};

export type RawObligation = {
  obligation_type: string;
  plan_id: string;
  tournament_id: string | null;
  source_name: string | null;
  allocation_id: string;
  label: string;
  status: string;
  amount: number | string;
  athlete_name: string | null;
  team_name: string | null;
};

export type RawEventFinance = {
  calendar_event_id: string | null;
  tournament_id: string | null;
  ur_play_session_id: string | null;
  season_id: string | null;
  pole_id: string | null;
  venue_id: string | null;
  verified_revenue: number | string | null;
  projected_revenue: number | string | null;
  verified_expense: number | string | null;
  projected_expense: number | string | null;
  verified_margin: number | string | null;
};

export type AdminFinanceRepositoryData = {
  payments: RawPaymentOperation[] | null;
  obligations: RawObligation[] | null;
  events: RawEventFinance[] | null;
  errors: string[];
};

export async function fetchAdminFinanceRepositoryData(): Promise<AdminFinanceRepositoryData> {
  const supabase = await createClient();
  const errors: string[] = [];
  const [paymentsResult, obligationsResult, eventsResult] = await Promise.all([
    supabase
      .from("admin_payment_operations")
      .select(
        "id,description,amount,status,due_at,athlete_name,team_name,product_name,package_name,paid_amount",
      )
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("admin_prize_repass_operations")
      .select(
        "obligation_type,plan_id,tournament_id,source_name,allocation_id,label,status,amount,athlete_name,team_name",
      )
      .order("updated_at", { ascending: false })
      .limit(200),
    supabase
      .from("event_financial_summaries")
      .select(
        "calendar_event_id,tournament_id,ur_play_session_id,season_id,pole_id,venue_id,verified_revenue,projected_revenue,verified_expense,projected_expense,verified_margin",
      )
      .limit(500),
  ]);

  if (paymentsResult.error)
    errors.push(`admin_payment_operations: ${paymentsResult.error.message}`);
  if (obligationsResult.error)
    errors.push(
      `admin_prize_repass_operations: ${obligationsResult.error.message}`,
    );
  if (eventsResult.error)
    errors.push(`event_financial_summaries: ${eventsResult.error.message}`);

  return {
    payments: paymentsResult.error
      ? null
      : ((paymentsResult.data as RawPaymentOperation[] | null) ?? []),
    obligations: obligationsResult.error
      ? null
      : ((obligationsResult.data as RawObligation[] | null) ?? []),
    events: eventsResult.error
      ? null
      : ((eventsResult.data as RawEventFinance[] | null) ?? []),
    errors,
  };
}
