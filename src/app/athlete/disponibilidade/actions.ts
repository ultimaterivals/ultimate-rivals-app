"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const availabilitySchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startsAt: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endsAt: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  poleId: z.union([z.literal(""), z.string().uuid()]),
  modality: z.literal("beach_volleyball"),
  formatCodes: z.array(z.enum(["doubles", "fours"])),
  categoryCodes: z.array(z.enum(["female", "male", "mixed"])),
});

function minutes(value: string, midnightAsEnd = false) {
  if (midnightAsEnd && value === "00:00") return 24 * 60;
  const parts = value.split(":");
  const hour = Number(parts[0] ?? 0);
  const minute = Number(parts[1] ?? 0);
  return hour * 60 + minute;
}

function databaseTime(value: string, asEnd = false) {
  if (asEnd && value === "00:00") return "24:00:00";
  return `${value}:00`;
}

function finishAvailability(query: string): never {
  revalidatePath("/athlete/agenda");
  revalidatePath("/athlete/disponibilidade");
  redirect(`/athlete/agenda?${query}#disponibilidade`);
}

async function currentAthleteId(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("athletes")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();

  if (error || !data?.id) return null;
  return { supabase, athleteId: data.id as string };
}

export async function createAvailabilityWindow(formData: FormData) {
  const user = await requireRole(["athlete"]);
  const parsed = availabilitySchema.safeParse({
    dayOfWeek: formData.get("dayOfWeek"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    poleId: formData.get("poleId") ?? "",
    modality: formData.get("modality"),
    formatCodes: formData.getAll("formatCodes"),
    categoryCodes: formData.getAll("categoryCodes"),
  });

  if (!parsed.success) finishAvailability("error=invalid");

  const start = minutes(parsed.data.startsAt);
  const end = minutes(parsed.data.endsAt, true);
  if (start < 6 * 60 || start >= 24 * 60 || end > 24 * 60 || end <= start) {
    finishAvailability("error=time");
  }

  const identity = await currentAthleteId(user.userId);
  if (!identity) finishAvailability("error=profile");

  const { error } = await identity.supabase
    .from("athlete_availability_windows")
    .insert({
      athlete_id: identity.athleteId,
      day_of_week: parsed.data.dayOfWeek,
      starts_at: databaseTime(parsed.data.startsAt),
      ends_at: databaseTime(parsed.data.endsAt, true),
      pole_id: parsed.data.poleId || null,
      modality: parsed.data.modality,
      format_codes: parsed.data.formatCodes,
      category_codes: parsed.data.categoryCodes,
      active: true,
    });

  if (error) finishAvailability("error=save");

  finishAvailability("success=availability_saved");
}

export async function deleteAvailabilityWindow(formData: FormData) {
  const user = await requireRole(["athlete"]);
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) finishAvailability("error=invalid");

  const identity = await currentAthleteId(user.userId);
  if (!identity) finishAvailability("error=profile");

  const { error } = await identity.supabase
    .from("athlete_availability_windows")
    .delete()
    .eq("id", id.data)
    .eq("athlete_id", identity.athleteId);

  if (error) finishAvailability("error=delete");

  finishAvailability("success=availability_deleted");
}
