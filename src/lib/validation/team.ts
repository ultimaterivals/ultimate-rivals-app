import { z } from "zod";
const uuid = z.uuid();
const optionalText = (max: number) =>
  z.string().trim().max(max).nullable().optional();
export const createTeam360Schema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9-]{1,63}$/),
  shortName: optionalText(24),
  primaryPoleId: uuid,
  description: optionalText(1200),
  foundedAt: z.iso.date().nullable().optional(),
  instagramHandle: optionalText(30),
});
export const updateTeamSchema = createTeam360Schema
  .partial()
  .extend({ teamId: uuid });
export const assignTeamPoleSchema = z.object({
  teamId: uuid,
  poleId: uuid,
  seasonId: uuid,
  startsAt: z.iso.datetime(),
  reason: optionalText(500),
});
export const assignTeamManagerSchema = z.object({
  teamId: uuid,
  profileId: uuid,
  managementRole: z.enum(["owner", "manager", "assistant"]),
  startsAt: z.iso.datetime(),
});
export const addAthleteToTeamSchema = z.object({
  teamId: uuid,
  athleteId: uuid,
  seasonId: uuid,
  membershipType: z.enum(["athlete", "captain"]),
  startsAt: z.iso.datetime(),
});
export const endMembershipSchema = z.object({
  membershipId: uuid,
  endsAt: z.iso.datetime(),
});
export const createTeamRosterSchema = z.object({
  teamId: uuid,
  seasonId: uuid,
  categoryId: uuid,
  formatId: uuid,
  level: z.enum(["n3", "n2", "n1"]),
  name: optionalText(100),
});
export const updateRosterSchema = createTeamRosterSchema
  .partial()
  .extend({ rosterId: uuid });
export const addTeamRosterMemberSchema = z.object({
  rosterId: uuid,
  athleteId: uuid,
  role: z.enum(["starter", "reserve"]),
  isCaptain: z.coerce.boolean().default(false),
  joinedAt: z.iso.datetime(),
});
export const removeRosterMemberSchema = z.object({
  memberId: uuid,
  leftAt: z.iso.datetime(),
});
export const archiveRosterSchema = z.object({ rosterId: uuid });
export function validateRosterShape(
  format: "doubles" | "fours",
  members: readonly { role: "starter" | "reserve" }[],
  activating = false,
) {
  const starters = members.filter((m) => m.role === "starter").length,
    reserves = members.filter((m) => m.role === "reserve").length;
  if (format === "doubles") {
    if (starters > 2 || reserves > 0)
      throw new Error(
        "Dupla aceita no máximo dois titulares e nenhuma reserva.",
      );
    if (activating && starters !== 2)
      throw new Error("Dupla ativa exige exatamente dois titulares.");
  } else {
    if (starters > 4 || reserves > 3 || members.length > 7)
      throw new Error("Quarteto aceita quatro titulares e até três reservas.");
    if (activating && starters !== 4)
      throw new Error("Quarteto ativo exige quatro titulares.");
  }
  return { starters, reserves, total: members.length };
}
