export const engagementEventNames = [
  "athlete_profile_viewed",
  "athlete_photo_upload_started",
  "athlete_photo_upload_completed",
  "athlete_photo_upload_failed",
  "athlete_photo_updated",
  "athlete_photo_removed",
  "athlete_photo_visibility_changed",
  "ranking_viewed",
  "ranking_podium_viewed",
  "ranking_athlete_clicked",
  "ranking_own_position_viewed",
  "ranking_filter_changed",
] as const;

export type EngagementEventName = (typeof engagementEventNames)[number];

export type EngagementMetadata = Record<
  string,
  string | number | boolean | null
>;

const piiKeys = [
  "email",
  "phone",
  "telefone",
  "nome_completo",
  "full_name",
  "image",
  "storage_url",
  "storage_path",
  "signed_url",
  "token",
  "cookie",
  "secret",
  "password",
  "raw_ip",
  "ip",
  "dob",
] as const;

export function sanitizeEngagementMetadata(
  metadata: EngagementMetadata = {},
): EngagementMetadata {
  return Object.fromEntries(
    Object.entries(metadata).filter(([key, value]) => {
      const normalized = key.toLowerCase();
      if (piiKeys.some((pii) => normalized.includes(pii))) return false;
      if (typeof value === "string" && value.length > 160) return false;
      return value !== undefined;
    }),
  );
}

export function fileSizeBucket(bytes: number) {
  if (bytes <= 100 * 1024) return "0_100kb";
  if (bytes <= 500 * 1024) return "100_500kb";
  if (bytes <= 1024 * 1024) return "500kb_1mb";
  if (bytes <= 3 * 1024 * 1024) return "1_3mb";
  return "3_5mb";
}

export function safeFailureReason(value: string) {
  const allowed = [
    "INVALID_TYPE",
    "FILE_TOO_LARGE",
    "INVALID_SIGNATURE",
    "INVALID_DIMENSIONS",
    "PROCESSING_FAILED",
    "UPLOAD_FAILED",
    "PERMISSION_DENIED",
  ];
  return allowed.includes(value) ? value : "PROCESSING_FAILED";
}
