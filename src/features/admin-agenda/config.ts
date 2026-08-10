export const AGENDA_TIME_ZONE = "America/Sao_Paulo";
export const AGENDA_DEFAULT_START_HOUR = 6;
export const AGENDA_DEFAULT_END_HOUR = 24;
export const AGENDA_SLOT_MINUTES = 30;
export const UR_PLAY_DEFAULT_DURATION_MINUTES = 120;

export const agendaViewPresets = [
  { key: "full", label: "06–00", startHour: 6, endHour: 24 },
  { key: "day", label: "06–18", startHour: 6, endHour: 18 },
  { key: "prime", label: "12–00", startHour: 12, endHour: 24 },
  { key: "night", label: "18–00", startHour: 18, endHour: 24 },
] as const;
