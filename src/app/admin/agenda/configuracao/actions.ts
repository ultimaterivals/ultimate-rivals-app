"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const dateTimeSchema = z.string().min(16).max(16);
const optionalDateTimeSchema = z.union([z.literal(""), dateTimeSchema]);

const seasonSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9-]{1,31}$/),
  startsAt: dateTimeSchema,
  endsAt: dateTimeSchema,
  registrationStartsAt: optionalDateTimeSchema,
  registrationEndsAt: optionalDateTimeSchema,
  rankingCutoffAt: optionalDateTimeSchema,
});

const cycleSchema = z.object({
  seasonId: z.string().uuid(),
  cycleNumber: z.coerce.number().int().min(1).max(3),
  name: z.string().trim().min(2).max(80),
  startsAt: dateTimeSchema,
  endsAt: dateTimeSchema,
});

const poleSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9-]{1,63}$/),
  city: z.string().trim().min(2).max(100),
  state: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/),
});

const venueSchema = z.object({
  poleId: z.string().uuid(),
  venueName: z.string().trim().min(2).max(120),
  addressLine: z.string().trim().max(240),
  city: z.string().trim().max(100),
  state: z.string().trim().max(2),
  courtName: z.string().trim().min(2).max(100),
});

function saoPauloTimestamp(value: string) {
  return `${value}:00-03:00`;
}

function nullableTimestamp(value: string) {
  return value ? saoPauloTimestamp(value) : null;
}

function setupError(message: string) {
  const codes = [
    "ADMIN_REQUIRED",
    "INVALID_SEASON_NAME",
    "INVALID_SEASON_CODE",
    "INVALID_SEASON_PERIOD",
    "INCOMPLETE_REGISTRATION_PERIOD",
    "INVALID_REGISTRATION_PERIOD",
    "INVALID_RANKING_CUTOFF",
    "SEASON_NOT_FOUND",
    "INVALID_CYCLE_NUMBER",
    "INVALID_CYCLE_NAME",
    "INVALID_CYCLE_PERIOD",
    "CYCLE_OUTSIDE_SEASON",
    "INVALID_POLE_NAME",
    "INVALID_POLE_SLUG",
    "INVALID_POLE_CITY",
    "INVALID_POLE_STATE",
    "POLE_NOT_FOUND",
    "POLE_REQUIRES_VENUE",
    "POLE_REQUIRES_COURT",
    "VENUE_REQUIRES_COURT",
    "INVALID_VENUE_NAME",
    "INVALID_COURT_NAME",
    "INVALID_VENUE_STATE",
  ];
  return codes.find((code) => message.includes(code)) ?? "setup_failed";
}

function finish(kind: string): never {
  revalidatePath("/admin/agenda");
  revalidatePath("/admin/agenda/configuracao");
  redirect(`/admin/agenda/configuracao?success=${encodeURIComponent(kind)}`);
}

function fail(message: string): never {
  redirect(
    `/admin/agenda/configuracao?error=${encodeURIComponent(setupError(message))}`,
  );
}

export async function createSeasonAction(formData: FormData) {
  await requireRole(["admin"]);
  const parsed = seasonSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    registrationStartsAt: formData.get("registrationStartsAt") ?? "",
    registrationEndsAt: formData.get("registrationEndsAt") ?? "",
    rankingCutoffAt: formData.get("rankingCutoffAt") ?? "",
  });
  if (!parsed.success) fail("invalid_request");

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_create_season", {
    p_name: parsed.data.name,
    p_code: parsed.data.code,
    p_starts_at: saoPauloTimestamp(parsed.data.startsAt),
    p_ends_at: saoPauloTimestamp(parsed.data.endsAt),
    p_registration_starts_at: nullableTimestamp(
      parsed.data.registrationStartsAt,
    ),
    p_registration_ends_at: nullableTimestamp(parsed.data.registrationEndsAt),
    p_ranking_cutoff_at: nullableTimestamp(parsed.data.rankingCutoffAt),
  });
  if (error) fail(error.message);
  finish("season_created");
}

export async function configureCycleAction(formData: FormData) {
  await requireRole(["admin"]);
  const parsed = cycleSchema.safeParse({
    seasonId: formData.get("seasonId"),
    cycleNumber: formData.get("cycleNumber"),
    name: formData.get("name"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
  });
  if (!parsed.success) fail("invalid_request");

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_create_season_cycle", {
    p_season_id: parsed.data.seasonId,
    p_cycle_number: parsed.data.cycleNumber,
    p_name: parsed.data.name,
    p_starts_at: saoPauloTimestamp(parsed.data.startsAt),
    p_ends_at: saoPauloTimestamp(parsed.data.endsAt),
  });
  if (error) fail(error.message);
  finish("cycle_configured");
}

export async function createPoleAction(formData: FormData) {
  await requireRole(["admin"]);
  const parsed = poleSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    city: formData.get("city"),
    state: formData.get("state"),
  });
  if (!parsed.success) fail("invalid_request");

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_create_pole", {
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
    p_city: parsed.data.city,
    p_state: parsed.data.state.toUpperCase(),
  });
  if (error) fail(error.message);
  finish("pole_created");
}

export async function createVenueWithCourtAction(formData: FormData) {
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
  if (error) fail(error.message);
  finish("venue_created");
}

export async function activatePoleStackAction(formData: FormData) {
  await requireRole(["admin"]);
  const poleId = z.string().uuid().safeParse(formData.get("poleId"));
  if (!poleId.success) fail("invalid_request");

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_activate_pole_stack", {
    p_pole_id: poleId.data,
  });
  if (error) fail(error.message);
  finish("pole_activated");
}
