"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();
const dateTime = z.string().min(16).max(16);

const venueSchema = z.object({
  poleId: uuid,
  venueName: z.string().trim().min(2).max(120),
  addressLine: z.string().trim().max(240),
  city: z.string().trim().max(100),
  state: z.union([z.literal(""), z.string().trim().regex(/^[A-Za-z]{2}$/)]),
  courtName: z.string().trim().min(2).max(100),
});

const opportunitySchema = z.object({
  title: z.string().trim().min(2).max(140),
  startsAt: dateTime,
  endsAt: dateTime,
  courtId: uuid,
  level: z.enum(["leveling", "n3", "n2", "n1"]),
  formatCode: z.enum(["doubles", "fours"]),
  categoryCode: z.enum(["female", "male", "mixed"]),
  targetFormations: z.coerce.number().int().min(1).max(24),
  maxFormations: z.coerce.number().int().min(1).max(24),
  capacityAthletes: z.coerce.number().int().min(2).max(96),
});

const confirmationSchema = z.object({
  opportunityId: uuid,
  cycleId: uuid,
  courtId: uuid,
  registrationClosesAt: dateTime,
  priceAmount: z.coerce.number().min(0).max(100000),
  priceLabel: z.string().trim().max(80),
  cancellationHours: z.coerce.number().int().min(0).max(168),
  overrideReason: z.string().trim().max(500),
  confirmation: z.literal("CONFIRMAR"),
});

function timestamp(value: string) {
  return `${value}:00-03:00`;
}

function code(message: string) {
  const value = message.toUpperCase();
  const known = [
    "ADMIN_REQUIRED",
    "POLE_NOT_FOUND",
    "INVALID_VENUE_NAME",
    "INVALID_COURT_NAME",
    "INVALID_VENUE_STATE",
    "POLE_REQUIRES_VENUE",
    "POLE_REQUIRES_COURT",
    "VENUE_REQUIRES_COURT",
    "COURT_NOT_FOUND",
    "COURT_NOT_ACTIVE",
    "VENUE_NOT_FOUND",
    "VENUE_NOT_ACTIVE",
    "OPPORTUNITY_MUST_BE_FUTURE",
    "INVALID_OPPORTUNITY_PERIOD",
    "INVALID_FORMATION_TARGET",
    "INVALID_OPPORTUNITY_CAPACITY",
    "OPPORTUNITY_NOT_FOUND",
    "OPPORTUNITY_NOT_CONFIRMABLE",
    "INVALID_REGISTRATION_CLOSE",
    "SEASON_NOT_READY",
    "OPPORTUNITY_OUTSIDE_SEASON",
    "SEASON_CYCLE_NOT_FOUND",
    "SEASON_CYCLE_NOT_READY",
    "OPPORTUNITY_OUTSIDE_CYCLE",
    "COURT_NOT_READY",
    "VENUE_NOT_READY",
    "COURT_VENUE_MISMATCH",
    "DEMAND_NOT_READY",
  ];
  return known.find((item) => value.includes(item)) ?? "operation_failed";
}

function refresh() {
  for (const path of [
    "/admin",
    "/admin/agenda",
    "/admin/agenda/piloto",
    "/admin/agenda/configuracao",
    "/admin/agenda/homologacao",
    "/admin/agenda/confirmacao",
    "/admin/ur-play",
    "/athlete/agenda",
  ]) {
    revalidatePath(path);
  }
}

function fail(error: string): never {
  redirect(`/admin/agenda/piloto?error=${encodeURIComponent(error)}`);
}

function done(success: string): never {
  refresh();
  redirect(`/admin/agenda/piloto?success=${encodeURIComponent(success)}`);
}

export async function createPilotVenueAction(formData: FormData) {
  await requireRole(["admin"]);
  const parsed = venueSchema.safeParse({
    poleId: formData.get("poleId"),
    venueName: formData.get("venueName"),
    addressLine: formData.get("addressLine") ?? "",
    city: formData.get("city") ?? "",
    state: formData.get("state") ?? "",
    courtName: formData.get("courtName"),
  });
  if (!parsed.success) fail("invalid_request");

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_create_venue_with_court", {
    p_pole_id: parsed.data.poleId,
    p_venue_name: parsed.data.venueName,
    p_address_line: parsed.data.addressLine || null,
    p_city: parsed.data.city || null,
    p_state: parsed.data.state ? parsed.data.state.toUpperCase() : null,
    p_court_name: parsed.data.courtName,
  });
  if (error) fail(code(error.message));
  done("venue_created");
}

export async function homologatePilotInfrastructureAction(formData: FormData) {
  await requireRole(["admin"]);
  const parsed = z
    .object({ poleId: uuid, confirmation: z.literal("HOMOLOGAR") })
    .safeParse({
      poleId: formData.get("poleId"),
      confirmation: formData.get("confirmation"),
    });
  if (!parsed.success) fail("invalid_confirmation");

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_activate_pole_stack", {
    p_pole_id: parsed.data.poleId,
  });
  if (error) fail(code(error.message));
  done("infrastructure_homologated");
}

export async function createPilotOpportunityAction(formData: FormData) {
  await requireRole(["admin"]);
  const parsed = opportunitySchema.safeParse({
    title: formData.get("title"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    courtId: formData.get("courtId"),
    level: formData.get("level"),
    formatCode: formData.get("formatCode"),
    categoryCode: formData.get("categoryCode"),
    targetFormations: formData.get("targetFormations"),
    maxFormations: formData.get("maxFormations"),
    capacityAthletes: formData.get("capacityAthletes"),
  });
  if (!parsed.success || parsed.data.maxFormations < parsed.data.targetFormations) {
    fail("invalid_request");
  }

  const supabase = await createClient();
  const courtResult = await supabase
    .from("courts")
    .select("id,venue_id,status")
    .eq("id", parsed.data.courtId)
    .maybeSingle();
  if (courtResult.error || !courtResult.data) fail("COURT_NOT_FOUND");
  if (courtResult.data.status !== "active") fail("COURT_NOT_ACTIVE");

  const venueResult = await supabase
    .from("venues")
    .select("id,pole_id,status")
    .eq("id", courtResult.data.venue_id)
    .maybeSingle();
  if (venueResult.error || !venueResult.data) fail("VENUE_NOT_FOUND");
  if (venueResult.data.status !== "active") fail("VENUE_NOT_ACTIVE");

  const { error } = await supabase.rpc("admin_create_demand_opportunity", {
    p_opportunity_type: "ur_play",
    p_title: parsed.data.title,
    p_starts_at: timestamp(parsed.data.startsAt),
    p_ends_at: timestamp(parsed.data.endsAt),
    p_pole_id: venueResult.data.pole_id,
    p_venue_id: venueResult.data.id,
    p_court_id: courtResult.data.id,
    p_level: parsed.data.level,
    p_format_code: parsed.data.formatCode,
    p_category_code: parsed.data.categoryCode,
    p_target_formations: parsed.data.targetFormations,
    p_max_formations: parsed.data.maxFormations,
    p_capacity_athletes: parsed.data.capacityAthletes,
    p_court_count: 1,
    p_training_min_athletes: null,
  });
  if (error) fail(code(error.message));
  done("opportunity_created");
}

export async function confirmPilotSessionAction(formData: FormData) {
  await requireRole(["admin"]);
  const parsed = confirmationSchema.safeParse({
    opportunityId: formData.get("opportunityId"),
    cycleId: formData.get("cycleId"),
    courtId: formData.get("courtId"),
    registrationClosesAt: formData.get("registrationClosesAt"),
    priceAmount: formData.get("priceAmount"),
    priceLabel: formData.get("priceLabel") ?? "",
    cancellationHours: formData.get("cancellationHours"),
    overrideReason: formData.get("overrideReason") ?? "",
    confirmation: formData.get("confirmation"),
  });
  if (!parsed.success) fail("invalid_confirmation");

  const supabase = await createClient();
  const cycleResult = await supabase
    .from("season_cycles")
    .select("season_id")
    .eq("id", parsed.data.cycleId)
    .maybeSingle();
  if (cycleResult.error || !cycleResult.data?.season_id) {
    fail("SEASON_CYCLE_NOT_FOUND");
  }

  const { error } = await supabase.rpc("admin_confirm_ur_play_opportunity", {
    p_opportunity_id: parsed.data.opportunityId,
    p_season_id: cycleResult.data.season_id,
    p_cycle_id: parsed.data.cycleId,
    p_court_id: parsed.data.courtId,
    p_registration_closes_at: timestamp(parsed.data.registrationClosesAt),
    p_price_amount: parsed.data.priceAmount,
    p_price_label: parsed.data.priceLabel || null,
    p_cancel_without_charge_hours: parsed.data.cancellationHours,
    p_override_reason: parsed.data.overrideReason || null,
  });
  if (error) fail(code(error.message));
  done("session_confirmed");
}
