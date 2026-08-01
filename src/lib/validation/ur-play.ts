import { z } from "zod";
const uuid = z.uuid(),
  date = z.iso.datetime();
export const sessionStatuses = [
  "draft",
  "published",
  "registration_open",
  "registration_closed",
  "checkin_open",
  "in_progress",
  "completed",
  "cancelled",
] as const;
const transitions: Record<string, string> = {
  draft: "published",
  published: "registration_open",
  registration_open: "registration_closed",
  registration_closed: "checkin_open",
  checkin_open: "in_progress",
  in_progress: "completed",
};
export const canTransitionUrPlaySession = (from: string, to: string) =>
  transitions[from] === to;
const urPlaySessionFields = z.object({
    seasonId: uuid,
    seasonCycleId: uuid.nullable().optional(),
    poleId: uuid,
    venueId: uuid,
    name: z.string().trim().min(2).max(120),
    sessionDate: z.iso.date(),
    startsAt: date,
    endsAt: date,
    registrationOpensAt: date.nullable().optional(),
    registrationClosesAt: date.nullable().optional(),
    checkinOpensAt: date.nullable().optional(),
    checkinClosesAt: date.nullable().optional(),
    capacity: z.coerce.number().int().min(2).max(200),
    waitlistCapacity: z.coerce
      .number()
      .int()
      .min(0)
      .max(200)
      .nullable()
      .optional(),
    priceAmount: z.coerce.number().min(0).nullable().optional(),
    notes: z.string().max(3000).nullable().optional(),
  });
export const createUrPlaySessionSchema = urPlaySessionFields
  .refine((v) => v.endsAt > v.startsAt, {
    message: "Horário final deve ser posterior.",
  });
export const updateUrPlaySessionSchema = urPlaySessionFields
  .partial()
  .extend({ sessionId: uuid });
export const transitionUrPlaySessionSchema = z.object({
  sessionId: uuid,
  status: z.enum(sessionStatuses),
  reason: z.string().min(10).nullable().optional(),
});
export const registerAthleteSchema = z.object({
  sessionId: uuid,
  athleteId: uuid,
  source: z.enum(["athlete", "admin", "team_manager", "operator", "import"]),
  operationId: uuid,
});
export const cancelRegistrationSchema = z.object({
  registrationId: uuid,
  reason: z.string().min(2),
  operationId: uuid,
});
export const addWalkInSchema = registerAthleteSchema.extend({
  source: z.enum(["admin", "operator"]),
});
export const checkInAthleteSchema = z.object({
  registrationId: uuid,
  method: z.enum(["admin", "operator", "manual"]),
  operationId: uuid,
});
export const undoCheckInSchema = z.object({ registrationId: uuid });
export const setAttendanceSchema = z.object({
  registrationId: uuid,
  status: z.enum(["present", "absent", "no_show", "excused", "expected"]),
});
export const setPaymentStatusSchema = z.object({
  registrationId: uuid,
  status: z.enum(["not_required", "pending", "paid", "waived", "refunded"]),
  method: z.enum(["pix", "cash", "external", "complimentary"]).nullable(),
  reference: z.string().max(200).nullable().optional(),
});
export const assignSessionStaffSchema = z.object({
  sessionId: uuid,
  profileId: uuid,
  role: z.enum(["coordinator", "operator", "evaluator", "media"]),
  startsAt: date,
});
export const cancelUrPlaySessionSchema = z.object({
  sessionId: uuid,
  reason: z.string().trim().min(10),
});
export function allocateCapacity(capacity: number, confirmed: number) {
  return confirmed < capacity ? "confirmed" : "waitlisted";
}
export const isReadyForMatchmaking = (status: string) =>
  status === "in_progress" || status === "completed";
