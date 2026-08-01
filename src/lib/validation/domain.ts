import { z } from "zod";

const uuid = z.uuid();
const slug = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9-]+$/);
const optionalDateTime = z.iso.datetime().nullable().optional();

export const createAthleteSchema = z.object({
  profileId: uuid.nullable().optional(),
  publicName: z.string().trim().min(2).max(80),
  fullName: z.string().trim().min(2).max(160),
  birthDate: z.iso.date().nullable().optional(),
  gender: z.enum(["female", "male", "non_binary", "undisclosed"]),
  dominantHand: z.enum(["left", "right", "ambidextrous"]).nullable().optional(),
  heightCm: z.coerce.number().int().min(80).max(260).nullable().optional(),
  bio: z.string().trim().max(1000).nullable().optional(),
});

export const createPoleSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug,
  city: z.string().trim().min(2).max(100),
  state: z
    .string()
    .trim()
    .length(2)
    .transform((value) => value.toUpperCase()),
});
export const createTeamSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug,
  shortName: z.string().trim().max(24).nullable().optional(),
  primaryPoleId: uuid,
});
export const createMembershipSchema = z.object({
  athleteId: uuid,
  teamId: uuid,
  seasonId: uuid,
  membershipType: z.enum(["athlete", "captain"]),
  startsAt: z.iso.datetime(),
  endsAt: optionalDateTime,
});
export const assignLevelSchema = z.object({
  athleteId: uuid,
  seasonId: uuid,
  level: z.enum(["leveling", "n3", "n2", "n1"]),
  startsAt: z.iso.datetime(),
  endsAt: optionalDateTime,
  reason: z.string().trim().max(500).nullable().optional(),
});
export const createRosterSchema = z.object({
  teamId: uuid,
  seasonId: uuid,
  categoryId: uuid,
  formatId: uuid,
  level: z.enum(["leveling", "n3", "n2", "n1"]),
  name: z.string().trim().max(100).nullable().optional(),
});
export const addRosterMemberSchema = z.object({
  rosterId: uuid,
  athleteId: uuid,
  role: z.enum(["starter", "reserve", "captain"]),
  joinedAt: z.iso.datetime(),
});
export const createSeasonSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    code: slug.max(32),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime(),
    rankingCutoffAt: optionalDateTime,
  })
  .refine((value) => new Date(value.endsAt) > new Date(value.startsAt), {
    message: "A temporada deve terminar depois de começar.",
    path: ["endsAt"],
  });

export type CreateAthleteInput = z.infer<typeof createAthleteSchema>;
export type CreatePoleInput = z.infer<typeof createPoleSchema>;
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type CreateMembershipInput = z.infer<typeof createMembershipSchema>;
export type AssignLevelInput = z.infer<typeof assignLevelSchema>;
export type CreateRosterInput = z.infer<typeof createRosterSchema>;
export type AddRosterMemberInput = z.infer<typeof addRosterMemberSchema>;
export type CreateSeasonInput = z.infer<typeof createSeasonSchema>;
