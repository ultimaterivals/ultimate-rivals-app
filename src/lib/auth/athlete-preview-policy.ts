export const ATHLETE_PREVIEW_COOKIE = "ur_admin_athlete_preview";

export function canUseAthletePreview(role: string) {
  return role === "admin";
}

export function isAthletePreviewId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
