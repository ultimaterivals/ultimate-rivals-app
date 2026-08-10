export type AgendaPole = {
  id: string;
  name: string;
  slug: string;
  city: string;
  status: string;
};

export type AgendaDay = {
  date: string;
  weekday: string;
  shortLabel: string;
  isToday: boolean;
};

export type AgendaEvent = {
  id: string;
  name: string;
  eventType: string;
  status: string;
  startsAt: string;
  endsAt: string;
  poleId: string | null;
  poleName: string | null;
  venueName: string | null;
  openChecklistItems: number;
  conflictCount: number;
  interestedCount: number;
  reservedCount: number;
  waitlistCount: number;
  readyFormations: number;
  targetFormations: number;
  demandSignal: string | null;
};

export type AgendaDemandItem = {
  id: string;
  calendarEventId: string | null;
  title: string;
  status: string;
  signal: string | null;
  startsAt: string | null;
  endsAt: string | null;
  poleId: string | null;
  poleName: string | null;
  venueName: string | null;
  level: string | null;
  formatCode: string | null;
  categoryCode: string | null;
  interestedCount: number;
  readyFormations: number;
  targetFormations: number;
  reservedCount: number;
  waitlistCount: number;
  remainingCapacity: number;
};

export type AgendaAvailabilityCell = {
  date: string;
  dayOfWeek: number;
  startMinute: number;
  startLabel: string;
  athleteCount: number;
  flexibleAthletes: number;
};

export type AgendaAvailability = {
  windows: number | null;
  athletes: number | null;
  peakAthletes: number | null;
  cells: AgendaAvailabilityCell[] | null;
};

export type AgendaMetrics = {
  events: number | null;
  interested: number | null;
  reservations: number | null;
  waitlist: number | null;
  conflicts: number | null;
  openChecklistItems: number | null;
};

export type AdminAgendaSnapshot = {
  generatedAt: string;
  weekStart: string;
  weekEnd: string;
  days: AgendaDay[];
  startHour: number;
  endHour: number;
  selectedPoleId: string | null;
  poles: AgendaPole[] | null;
  events: AgendaEvent[] | null;
  demand: AgendaDemandItem[] | null;
  availability: AgendaAvailability;
  metrics: AgendaMetrics;
  sourceErrors: string[];
};

export type AgendaQuery = {
  week?: string;
  pole?: string;
  startHour?: number;
  endHour?: number;
};
