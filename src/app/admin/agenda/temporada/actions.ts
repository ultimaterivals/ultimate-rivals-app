"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const createSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9-]{1,31}$/),
  startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const homologateSchema = z.object({
  seasonId: z.string().uuid(),
  confirmation: z.literal("HOMOLOGAR"),
});

function errorCode(message: string) {
  const value = message.toUpperCase();
  const codes = [
    "ADMIN_REQUIRED",
    "INVALID_SEASON_NAME",
    "INVALID_SEASON_CODE",
    "INVALID_SEASON_START",
    "SEASON_CODE_EXISTS",
    "SEASON_NOT_FOUND",
    "SEASON_NOT_HOMOLOGATABLE",
    "SEASON_REQUIRES_THIRTEEN_WEEKS",
    "INVALID_SEASON_WEEK_PERIOD",
    "SEASON_WEEKS_OVERLAP",
    "SEASON_WEEKS_NOT_CONTIGUOUS",
    "SEASON_REQUIRES_THREE_COMPATIBILITY_CYCLES",
    "INVALID_SEASON_CYCLE_PERIOD",
    "SEASON_CYCLES_OVERLAP",
  ];
  return codes.find((code) => value.includes(code)) ?? "operation_failed";
}

function refresh() {
  revalidatePath("/admin");
  revalidatePath("/admin/agenda");
  revalidatePath("/admin/agenda/temporada");
  revalidatePath("/admin/agenda/configuracao");
}

export async function createQuarterSeasonAction(formData: FormData) {
  await requireRole(["admin"]);
  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    startsOn: formData.get("startsOn"),
  });
  if (!parsed.success) {
    redirect("/admin/agenda/temporada?error=invalid_request");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_create_quarter_season", {
    p_name: parsed.data.name,
    p_code: parsed.data.code,
    p_starts_on: parsed.data.startsOn,
  });
  if (error) {
    redirect(
      `/admin/agenda/temporada?error=${encodeURIComponent(errorCode(error.message))}`,
    );
  }

  refresh();
  redirect(`/admin/agenda/temporada?season=${data}&success=season_created`);
}

export async function homologateQuarterSeasonAction(formData: FormData) {
  await requireRole(["admin"]);
  const parsed = homologateSchema.safeParse({
    seasonId: formData.get("seasonId"),
    confirmation: formData.get("confirmation"),
  });
  if (!parsed.success) {
    redirect("/admin/agenda/temporada?error=invalid_confirmation");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_homologate_season", {
    p_season_id: parsed.data.seasonId,
  });
  if (error) {
    redirect(
      `/admin/agenda/temporada?season=${parsed.data.seasonId}&error=${encodeURIComponent(errorCode(error.message))}`,
    );
  }

  refresh();
  redirect(
    `/admin/agenda/temporada?season=${parsed.data.seasonId}&success=season_homologated`,
  );
}
