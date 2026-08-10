export type FinancePayment = {
  id: string;
  description: string;
  amount: number;
  paidAmount: number;
  status: string;
  dueAt: string | null;
  athleteName: string | null;
  teamName: string | null;
  productName: string | null;
  packageName: string | null;
};

export type FinanceObligation = {
  key: string;
  type: string;
  label: string;
  sourceName: string | null;
  status: string;
  amount: number;
  athleteName: string | null;
  teamName: string | null;
};

export type FinanceEvent = {
  calendarEventId: string | null;
  tournamentId: string | null;
  sessionId: string | null;
  seasonId: string | null;
  poleId: string | null;
  venueId: string | null;
  verifiedRevenue: number;
  projectedRevenue: number;
  verifiedExpense: number;
  projectedExpense: number;
  verifiedMargin: number;
};

export type AdminFinanceSnapshot = {
  metrics: {
    verifiedRevenue: number;
    projectedRevenue: number;
    verifiedExpense: number;
    projectedExpense: number;
    verifiedMargin: number;
    openCharges: number;
    openChargeAmount: number;
    openObligations: number;
    openObligationAmount: number;
    paidObligations: number;
    paidObligationAmount: number;
  };
  payments: FinancePayment[] | null;
  obligations: FinanceObligation[] | null;
  events: FinanceEvent[] | null;
  sourceErrors: string[];
};
