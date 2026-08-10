"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const opportunitySchema = z.object({
  opportunityType: z.enum(["ur_play", "training"]),
  title: z.string().trim().min(2).max(140),
  startsAt: z.string().min(16).max(16),
  endsAt: z.string().min(16).max(16),
  poleId: z.string().uuid(),
  venueId: z.union([z.literal(""), z.string().uuid()]),
  courtId: z.union([z.literal(""), z.string().uuid()]),
  level: z.enum(["", "leveling", "n3", "n2", "n1"]),
  formatCode: z.enum(["", "doubles", "fours"]),
  categoryCode: z.enum(["", "female", "male", "mixed"]),
  targetFormations: z.coerce.number().int().min(1).max(24),
  maxFormations: z.coerce.number().int().min(1).max(24),
  capacityAthletes: z.coerce.number().int().min(2).max(96),
  courtCount: z.coerce.number().int().min(1).max(8),
  trainingMinAthletes: z.union([
    z.literal(""),
    z.coerce.number().int().min(1).max(96),
  ]),
});

function timestamp(value: string) {
  return `${value}:00-03:00`;
}

function errorCode(message: string) {
  const codes = [
    "ADMIN_REQUIRED",
    "INVALID_OPPORTUNITY_TYPE",
    "INVALID_OPPORTUNITY_TITLE",
    "INVALID_OPPORTUNITY_PERIOD",
    "OPPORTUNITY_MUST_BE_FUTURE",
    "INVALID_FORMAT_CODE",
    "INVALID_CATEGORY_CODE",
    "INVALID_FORMATION_TARGET",
    "INVALID_OPPORTUNITY_CAPACITY",
    "INVALID_COURT_COUNT",
    "INVALID_TRAINING_MINIMUM",
    "POLE_NOT_FOUND",
    "POLE_NOT_ACTIVE",
    "VENUE_NOT_FOUND",
    "VENUE_POLE_MISMATCH",
    "VENUE_NOT_ACTIVE",
    "COURT_REQUIRES_VENUE",
    "COURT_NOT_FOUND",
    "COURT_VENUE_MISMATCH",
    "COURT_NOT_ACTIVE",
  ];
  return codes.find((code) => message.includes(code)) ?? "opportunity_failed";
}

function fail(message: string): never {
  redirect(
    `/admin/agenda/nova-oportunidade?error=${encodeURIComponent(errorCode(message))}`,
  );
}

export async function createDemandOpportunityAction(formData: FormData) {
  await requireRole(["admin"]);
  const parsed = opportunitySchema.safeParse({
    opportunityType: formData.get("opportunityType"),
    title: formData.get("title"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    poleId: formData.get("poleId"),
    venueId: formData.get("venueId") ?? "",
    courtId: formData.get("courtId") ?? "",
    level: formData.get("level") ?? "",
    formatCode: formData.get("formatCode") ?? "",
    categoryCode: formData.get("categoryCode") ?? "",
    targetFormations: formData.get("targetFormations"),
    maxFormations: formData.get("maxFormations"),
    capacityAthletes: formData.get("capacityAthletes"),
    courtCount: formData.get("courtCount"),
    trainingMinAthletes: formData.get("trainingMinAthletes") ?? "",
  });
  if (!parsed.success) {
    redirect("/admin/agenda/nova-oportunidade?error=invalid_request");
  }
  if (parsed.data.maxFormations < parsed.data.targetFormations) {
    redirect("/admin/agenda/nova-oportunidade?error=INVALID_FORMATION_TARGET");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_create_demand_opportunity", {
    p_opportunity_type: parsed.data.opportunityType,
    p_title: parsed.data.title,
    p_starts_at: timestamp(parsed.data.startsAt),
    p_ends_at: timestamp(parsed.data.endsAt),
    p_pole_id: parsed.data.poleId,
    p_venue_id: parsed.data.venueId || null,
    p_court_id: parsed.data.courtId || null,
    p_level: parsed.data.level || null,
    p_format_code: parsed.data.formatCode || null,
    p_category_code: parsed.data.categoryCode || null,
    p_target_formations: parsed.data.targetFormations,
    p_max_formations: parsed.data.maxFormations,
    p_capacity_athletes: parsed.data.capacityAthletes,
    p_court_count: parsed.data.courtCount,
    p_training_min_athletes:
      parsed.data.trainingMinAthletes === ""
        ? null
        : parsed.data.trainingMinAthletes,
  });
  if (error) fail(error.message);

  revalidatePath("/admin/agenda");
  revalidatePath("/athlete/agenda");
  redirect("/admin/agenda?created=opportunity");
}
