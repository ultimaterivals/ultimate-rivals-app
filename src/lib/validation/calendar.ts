export const calendarEventTypes = [
  "ur_play",
  "training",
  "hunter",
  "series",
  "cup",
  "legends",
  "clinic",
  "partner_event",
  "special_event",
] as const;

export const checklistPhases = [
  "d_minus_14",
  "d_minus_7",
  "d_minus_3",
  "d_day",
  "d_plus_1",
  "d_plus_2",
] as const;

export const checklistOffsets: Record<
  (typeof checklistPhases)[number],
  number
> = {
  d_minus_14: -14,
  d_minus_7: -7,
  d_minus_3: -3,
  d_day: 0,
  d_plus_1: 1,
  d_plus_2: 2,
};

export type Q1TemplateSlot = {
  pole: "betim" | "contagem";
  weekday: 1 | 2 | 3 | 4 | 5 | 6;
  startsAt: string;
  endsAt: string;
  eventType:
    | "ur_play"
    | "training"
    | "hunter"
    | "series"
    | "cup"
    | "legends"
    | "clinic"
    | "partner_event"
    | "special_event";
  competitionMode: "rotation" | "scheduled_rounds" | "tournament";
  alternatesFriday?: boolean;
};

export const q1BaseCalendarSlots: Q1TemplateSlot[] = [
  {
    pole: "betim",
    weekday: 1,
    startsAt: "18:00",
    endsAt: "20:00",
    eventType: "ur_play",
    competitionMode: "scheduled_rounds",
  },
  {
    pole: "betim",
    weekday: 1,
    startsAt: "20:00",
    endsAt: "22:00",
    eventType: "ur_play",
    competitionMode: "scheduled_rounds",
  },
  {
    pole: "betim",
    weekday: 2,
    startsAt: "18:00",
    endsAt: "20:00",
    eventType: "ur_play",
    competitionMode: "scheduled_rounds",
  },
  {
    pole: "betim",
    weekday: 2,
    startsAt: "20:00",
    endsAt: "22:00",
    eventType: "ur_play",
    competitionMode: "scheduled_rounds",
  },
  {
    pole: "contagem",
    weekday: 3,
    startsAt: "18:00",
    endsAt: "20:00",
    eventType: "ur_play",
    competitionMode: "scheduled_rounds",
  },
  {
    pole: "contagem",
    weekday: 3,
    startsAt: "20:00",
    endsAt: "22:00",
    eventType: "ur_play",
    competitionMode: "scheduled_rounds",
  },
  {
    pole: "contagem",
    weekday: 4,
    startsAt: "18:00",
    endsAt: "20:00",
    eventType: "ur_play",
    competitionMode: "scheduled_rounds",
  },
  {
    pole: "contagem",
    weekday: 4,
    startsAt: "20:00",
    endsAt: "22:00",
    eventType: "ur_play",
    competitionMode: "scheduled_rounds",
  },
  {
    pole: "betim",
    weekday: 5,
    startsAt: "18:00",
    endsAt: "20:00",
    eventType: "ur_play",
    competitionMode: "scheduled_rounds",
    alternatesFriday: true,
  },
  {
    pole: "betim",
    weekday: 5,
    startsAt: "20:00",
    endsAt: "22:00",
    eventType: "ur_play",
    competitionMode: "scheduled_rounds",
    alternatesFriday: true,
  },
  {
    pole: "contagem",
    weekday: 5,
    startsAt: "18:00",
    endsAt: "20:00",
    eventType: "ur_play",
    competitionMode: "scheduled_rounds",
    alternatesFriday: true,
  },
  {
    pole: "contagem",
    weekday: 5,
    startsAt: "20:00",
    endsAt: "22:00",
    eventType: "ur_play",
    competitionMode: "scheduled_rounds",
    alternatesFriday: true,
  },
];

export function eventWindowsOverlap(
  left: { startsAt: Date; endsAt: Date },
  right: { startsAt: Date; endsAt: Date },
) {
  return left.startsAt < right.endsAt && right.startsAt < left.endsAt;
}

export function checklistDueAt(
  eventStartsAt: Date,
  phase: keyof typeof checklistOffsets,
) {
  const due = new Date(eventStartsAt);
  due.setUTCDate(due.getUTCDate() + checklistOffsets[phase]);
  return due;
}
