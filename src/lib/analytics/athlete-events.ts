export type AthleteAnalyticsEvent =
  | "dashboard_viewed"
  | "ur_play_opened"
  | "registration_started"
  | "ranking_opened"
  | "performance_opened"
  | "notification_opened";

export interface AthleteAnalyticsPayload {
  event: AthleteAnalyticsEvent;
  context?: "home" | "navigation" | "notification";
}

/** Local contract only. No vendor, network request, identifier or PII is attached. */
export function emitAthleteAnalytics(payload: AthleteAnalyticsPayload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("ur:analytics-ready", { detail: payload }),
  );
}
