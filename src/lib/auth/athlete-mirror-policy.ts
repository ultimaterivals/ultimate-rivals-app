export const ATHLETE_MIRROR_COOKIE = "ur_admin_athlete_mirror";

export function canUseAthleteMirror(role: string) {
  return role === "admin";
}

export function isAthleteMirrorId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
