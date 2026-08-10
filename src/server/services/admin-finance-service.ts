import type {
  AdminFinanceSnapshot,
  FinanceEvent,
  FinanceObligation,
  FinancePayment,
} from "@/features/admin-finance/types";
import { fetchAdminFinanceRepositoryData } from "@/server/repositories/admin-finance-repository";

function number(value: number | string | null | undefined) {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

const closedObligationStatuses = new Set(["paid", "void"]);
const openPaymentStatuses = new Set(["pending", "submitted"]);

export async function getAdminFinanceSnapshot(): Promise<AdminFinanceSnapshot> {
  const raw = await fetchAdminFinanceRepositoryData();

  const payments: FinancePayment[] | null = raw.payments
    ? raw.payments.map((item) => ({
        id: item.id,
        description: item.description,
        amount: number(item.amount),
        paidAmount: number(item.paid_amount),
        status: item.status,
        dueAt: item.due_at,
        athleteName: item.athlete_name,
        teamName: item.team_name,
        productName: item.product_name,
        packageName: item.package_name,
      }))
    : null;

  const obligations: FinanceObligation[] | null = raw.obligations
    ? raw.obligations.map((item) => ({
        key: `${item.obligation_type}:${item.allocation_id}`,
        type: item.obligation_type,
        label: item.label,
        sourceName: item.source_name,
        status: item.status,
        amount: number(item.amount),
        athleteName: item.athlete_name,
        teamName: item.team_name,
      }))
    : null;

  const events: FinanceEvent[] | null = raw.events
    ? raw.events.map((item) => ({
        calendarEventId: item.calendar_event_id,
        tournamentId: item.tournament_id,
        sessionId: item.ur_play_session_id,
        seasonId: item.season_id,
        poleId: item.pole_id,
        venueId: item.venue_id,
        verifiedRevenue: number(item.verified_revenue),
        projectedRevenue: number(item.projected_revenue),
        verifiedExpense: number(item.verified_expense),
        projectedExpense: number(item.projected_expense),
        verifiedMargin: number(item.verified_margin),
      }))
    : null;

  const openPayments = (payments ?? []).filter((item) =>
    openPaymentStatuses.has(item.status),
  );
  const openObligations = (obligations ?? []).filter(
    (item) => !closedObligationStatuses.has(item.status),
  );
  const paidObligations = (obligations ?? []).filter(
    (item) => item.status === "paid",
  );

  return {
    metrics: {
      verifiedRevenue: (events ?? []).reduce(
        (sum, item) => sum + item.verifiedRevenue,
        0,
      ),
      projectedRevenue: (events ?? []).reduce(
        (sum, item) => sum + item.projectedRevenue,
        0,
      ),
      verifiedExpense: (events ?? []).reduce(
        (sum, item) => sum + item.verifiedExpense,
        0,
      ),
      projectedExpense: (events ?? []).reduce(
        (sum, item) => sum + item.projectedExpense,
        0,
      ),
      verifiedMargin: (events ?? []).reduce(
        (sum, item) => sum + item.verifiedMargin,
        0,
      ),
      openCharges: openPayments.length,
      openChargeAmount: openPayments.reduce(
        (sum, item) => sum + Math.max(item.amount - item.paidAmount, 0),
        0,
      ),
      openObligations: openObligations.length,
      openObligationAmount: openObligations.reduce(
        (sum, item) => sum + item.amount,
        0,
      ),
      paidObligations: paidObligations.length,
      paidObligationAmount: paidObligations.reduce(
        (sum, item) => sum + item.amount,
        0,
      ),
    },
    payments,
    obligations,
    events,
    sourceErrors: raw.errors,
  };
}
