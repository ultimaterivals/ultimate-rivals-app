import { z } from "zod";

const nullableText = (max: number) =>
  z.string().trim().max(max).nullable().optional();
const state = z
  .string()
  .trim()
  .length(2)
  .transform((v) => v.toUpperCase())
  .nullable()
  .optional();
export const athleteEditableFields = {
  publicName: z.string().trim().min(2).max(80),
  bio: nullableText(1000),
  instagramHandle: nullableText(30),
  city: nullableText(100),
  state,
  phone: nullableText(24),
  emailContact: z.email().nullable().optional(),
};
export const createAthlete360Schema = z.object({
  ...athleteEditableFields,
  fullName: z.string().trim().min(2).max(160),
  birthDate: z.iso.date().nullable().optional(),
  gender: z.enum(["female", "male", "non_binary", "undisclosed"]),
  dominantHand: z.enum(["left", "right", "ambidextrous"]).nullable().optional(),
  heightCm: z.coerce.number().int().min(80).max(260).nullable().optional(),
  profileId: z.uuid().nullable().optional(),
  duplicateOverrideReason: nullableText(500),
});
export const updateAthleteByAdminSchema = createAthlete360Schema
  .partial()
  .extend({
    athleteId: z.uuid(),
    status: z
      .enum(["draft", "active", "inactive", "archived", "suspended"])
      .optional(),
  });
export const updateOwnAthleteProfileSchema = z.object({
  athleteId: z.uuid(),
  ...athleteEditableFields,
  dominantHand: z.enum(["left", "right", "ambidextrous"]).nullable().optional(),
  heightCm: z.coerce.number().int().min(80).max(260).nullable().optional(),
});
export const assignAthleteProfileSchema = z.object({
  athleteId: z.uuid(),
  profileId: z.uuid(),
});
export const assignAthleteLevelSchema = z.object({
  athleteId: z.uuid(),
  seasonId: z.uuid(),
  level: z.enum(["leveling", "n3", "n2", "n1"]),
  startsAt: z.iso.datetime(),
  reason: nullableText(500),
});
export const athleteStatusSchema = z.object({
  athleteId: z.uuid(),
  reason: z.string().trim().min(10).max(500).optional(),
});
export const createAthleteNoteSchema = z.object({
  athleteId: z.uuid(),
  noteType: z.enum(["general", "operational", "technical"]),
  content: z.string().trim().min(2).max(2000),
  visibility: z.enum(["internal", "athlete_visible"]),
});
export const athleteImportRowSchema = createAthlete360Schema.pick({
  publicName: true,
  fullName: true,
  birthDate: true,
  gender: true,
  emailContact: true,
  phone: true,
  city: true,
  state: true,
});
export const importAthletesSchema = z
  .array(athleteImportRowSchema)
  .min(1)
  .max(500);

export function normalizeAthleteName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, " ");
}
export function detectDuplicateCandidates(
  rows: readonly {
    fullName: string;
    birthDate?: string | null;
    emailContact?: string | null;
    phone?: string | null;
  }[],
) {
  const seen = new Map<string, number>();
  const duplicates: number[] = [];
  rows.forEach((row, index) => {
    const keys = [
      `n:${normalizeAthleteName(row.fullName)}:${row.birthDate ?? ""}`,
      row.emailContact ? `e:${row.emailContact.toLowerCase()}` : "",
      row.phone ? `p:${row.phone.replace(/\D/g, "")}` : "",
    ];
    if (keys.some((k) => k && seen.has(k))) duplicates.push(index);
    keys.filter(Boolean).forEach((k) => seen.set(k, index));
  });
  return duplicates;
}
export type CreateAthlete360Input = z.infer<typeof createAthlete360Schema>;
export type UpdateOwnAthleteProfileInput = z.infer<
  typeof updateOwnAthleteProfileSchema
>;
