"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

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

function setupError(message: string) {
  const codes = [
    "ADMIN_REQUIRED",
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
  revalidatePath("/admin");
  revalidatePath("/admin/agenda");
  revalidatePath("/admin/agenda/piloto");
  revalidatePath("/admin/agenda/configuracao");
  revalidatePath("/admin/agenda/homologacao");
  redirect(`/admin/agenda/configuracao?success=${encodeURIComponent(kind)}`);
}

function fail(message: string): never {
  redirect(
    `/admin/agenda/configuracao?error=${encodeURIComponent(setupError(message))}`,
  );
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
