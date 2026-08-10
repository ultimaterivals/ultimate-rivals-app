import {
  AGENDA_DEFAULT_END_HOUR,
  AGENDA_DEFAULT_START_HOUR,
  AGENDA_TIME_ZONE,
} from "@/features/admin-agenda/config";
import type {
  AdminAgendaSnapshot,
  AgendaDay,
  AgendaDemandItem,
  AgendaEvent,
  AgendaQuery,
} from "@/features/admin-agenda/types";
import { fetchAdminAgendaRepositoryData } from "@/server/repositories/admin-agenda-repository";

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function formatLocalDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: AGENDA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addDateDays(date: string, amount: number) {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

export function getWeekStart(date: string) {
  const safeDate = DATE_PATTERN.test(date) ? date : formatLocalDate(new Date());
  const value = new Date(`${safeDate}T12:00:00.000Z`);
  const day = value.getUTCDay();
  const daysFromMonday = (day + 6) % 7;
  value.setUTCDate(value.getUTCDate() - daysFromMonday);
  return value.toISOString().slice(0, 10);
}

function localDateRangeToUtc(weekStart: string) {
  const weekEnd = addDateDays(weekStart, 7);
  return {
    weekEnd,
    rangeStartIso: `${weekStart}T03:00:00.000Z`,
    rangeEndIso: `${weekEnd}T03:00:00.000Z`,
  };
}

function clampHour(value: number | undefined, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(24, Math.trunc(value ?? fallback)));
}

function buildDays(weekStart: string, today: string): AgendaDay[] {
  const weekdayFormatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    weekday: "short",
  });
  const shortFormatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
  });

  return Array.from({ length: 7 }, (_, index) => {
    const date = addDateDays(weekStart, index);
    const value = new Date(`${date}T12:00:00.000Z`);
    return {
      date,
      weekday: weekdayFormatter.format(value).replace(".", ""),
      shortLabel: shortFormatter.format(value),
      isToday: date === today,
    };
  });
}

export function getAgendaRange(query: AgendaQuery, now = new Date()) {
  const today = formatLocalDate(now);
  const weekStart = getWeekStart(query.week ?? today);
  const { weekEnd, rangeStartIso, rangeEndIso } =
    localDateRangeToUtc(weekStart);
  const startHour = clampHour(query.startHour, AGENDA_DEFAULT_START_HOUR);
  let endHour = clampHour(query.endHour, AGENDA_DEFAULT_END_HOUR);
  if (endHour <= startHour) endHour = Math.min(24, startHour + 6);

  return {
    today,
    weekStart,
    weekEnd,
    rangeStartIso,
    rangeEndIso,
    startHour,
    endHour,
  };
}

export async function getAdminAgendaSnapshot(
  query: AgendaQuery,
  now = new Date(),
): Promise<AdminAgendaSnapshot> {
  const range = getAgendaRange(query, now);
  const raw = await fetchAdminAgendaRepositoryData({
    rangeStartIso: range.rangeStartIso,
    rangeEndIso: range.rangeEndIso,
  });

  const selectedPoleId = query.pole && query.pole !== "all" ? query.pole : null;

  const rawEvents = raw.events
    ? raw.events.filter(
        (event) => !selectedPoleId || event.pole_id === selectedPoleId,
      )
    : null;
  const rawDemand = raw.demand
    ? raw.demand.filter(
        (item) => !selectedPoleId || item.pole_id === selectedPoleId,
      )
    : null;

  const demand: AgendaDemandItem[] | null = rawDemand
    ? rawDemand.map((item) => ({
        id: item.id,
        calendarEventId: item.calendar_event_id,
        title: item.title,
        status: item.status,
        signal: item.demand_signal,
        startsAt: item.starts_at,
        endsAt: item.ends_at,
        poleId: item.pole_id,
        poleName: item.pole_name,
        venueName: item.venue_name,
        level: item.level,
        formatCode: item.format_code,
        categoryCode: item.category_code,
        interestedCount: item.interested_count ?? 0,
        readyFormations: item.ready_formations ?? 0,
        targetFormations: item.target_formations,
        reservedCount: item.reserved_count ?? 0,
        waitlistCount: item.waitlist_count ?? 0,
        remainingCapacity: item.remaining_capacity ?? 0,
      }))
    : null;

  const demandByCalendarEvent = new Map(
    (demand ?? [])
      .filter((item) => item.calendarEventId)
      .map((item) => [item.calendarEventId as string, item]),
  );

  const events: AgendaEvent[] | null = rawEvents
    ? rawEvents.map((event) => {
        const linkedDemand = demandByCalendarEvent.get(event.id);
        return {
          id: event.id,
          name: event.name,
          eventType: event.event_type,
          status: event.status,
          startsAt: event.starts_at,
          endsAt: event.ends_at,
          poleId: event.pole_id,
          poleName: event.pole_name,
          venueName: event.venue_name,
          openChecklistItems: event.open_checklist_items ?? 0,
          conflictCount: event.conflict_count ?? 0,
          interestedCount: linkedDemand?.interestedCount ?? 0,
          reservedCount: linkedDemand?.reservedCount ?? 0,
          waitlistCount: linkedDemand?.waitlistCount ?? 0,
          readyFormations: linkedDemand?.readyFormations ?? 0,
          targetFormations: linkedDemand?.targetFormations ?? 0,
          demandSignal: linkedDemand?.signal ?? null,
        };
      })
    : null;

  const metrics = {
    events: events ? events.length : null,
    interested: demand
      ? demand.reduce((total, item) => total + item.interestedCount, 0)
      : null,
    reservations: demand
      ? demand.reduce((total, item) => total + item.reservedCount, 0)
      : null,
    waitlist: demand
      ? demand.reduce((total, item) => total + item.waitlistCount, 0)
      : null,
    conflicts: events
      ? events.reduce((total, event) => total + event.conflictCount, 0)
      : null,
    openChecklistItems: events
      ? events.reduce((total, event) => total + event.openChecklistItems, 0)
      : null,
  };

  return {
    generatedAt: now.toISOString(),
    weekStart: range.weekStart,
    weekEnd: range.weekEnd,
    days: buildDays(range.weekStart, range.today),
    startHour: range.startHour,
    endHour: range.endHour,
    selectedPoleId,
    poles: raw.poles
      ? raw.poles.map((pole) => ({
          id: pole.id,
          name: pole.name,
          slug: pole.slug,
          city: pole.city,
          status: pole.status,
        }))
      : null,
    events,
    demand,
    metrics,
    sourceErrors: raw.errors,
  };
}

export function shiftAgendaWeek(weekStart: string, weeks: number) {
  return addDateDays(weekStart, weeks * 7);
}

export function agendaDateForInstant(value: string) {
  return formatLocalDate(new Date(value));
}

export function minutesSinceDayStart(value: string, date: string) {
  const instant = new Date(value);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: AGENDA_TIME_ZONE,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts = formatter.formatToParts(instant);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? 0,
  );
  if (agendaDateForInstant(value) !== date) return null;
  return hour * 60 + minute;
}

export function durationMinutes(startsAt: string, endsAt: string) {
  return Math.max(
    AGENDA_SLOT_MINUTES_FALLBACK,
    Math.round(
      (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000,
    ),
  );
}

const AGENDA_SLOT_MINUTES_FALLBACK = 30;
void DAY_MS;
