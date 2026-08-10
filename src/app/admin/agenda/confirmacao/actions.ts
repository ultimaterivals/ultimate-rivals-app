"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const confirmSchema = z.object({
  opportunityId: z.string().uuid(),
  cycleId: z.string().uuid(),
  courtId: z.string().uuid(),
  registrationClosesAt: z.string().min(16).max(16),
  priceAmount: z.coerce.number().min(0).max(100000),
  priceLabel: z.string().trim().max(80),
  cancellationHours: z.coerce.number().int().min(0).max(168),
  overrideReason: z.string().trim().max(500),
});

function timestamp(value: string) {
  return `${value}:00-03:00`;
}

function confirmationError(message: string) {
  const codes = [
    "ADMIN_REQUIRED",
    "OPPORTUNITY_NOT_FOUND",
    "OPPORTUNITY_NOT_UR_PLAY",
    "OPPORTUNITY_NOT_CONFIRMABLE",
    "OPPORTUNITY_ALREADY_LINKED",
    "INVALID_OPPORTUNITY_PERIOD",
    "UR_PLAY_REQUIRES_POLE",
    "UR_PLAY_REQUIRES_FORMAT",
    "INVALID_REGISTRATION_CLOSE",
    "INVALID_PRICE_AMOUNT",
    "INVALID_CANCELLATION_WINDOW",
    "SEASON_NOT_READY",
    "OPPORTUNITY_OUTSIDE_SEASON",
    "SEASON_CYCLE_NOT_FOUND",
    "SEASON_CYCLE_NOT_READY",
    "OPPORTUNITY_OUTSIDE_CYCLE",
    "COURT_NOT_READY",
    "VENUE_NOT_READY",
    "COURT_VENUE_MISMATCH",
    "FORMAT_NOT_FOUND",
    "CATEGORY_NOT_FOUND",
    "DEMAND_NOT_READY",
  ];
  return codes.find((code) => message.includes(code)) ?? "confirmation_failed";
}

function fail(message: string): never {
  redirect(
    `/admin/agenda/confirmacao?error=${encodeURIComponent(confirmationError(message))}`,
  );
}

export async function confirmUrPlayOpportunityAction(formData: FormData) {
  await requireRole(["admin"]);
  const parsed = confirmSchema.safeParse({
    opportunityId: formData.get("opportunityId"),
    cycleId: formData.get("cycleId"),
    courtId: formData.get("courtId"),
    registrationClosesAt: formData.get("registrationClosesAt"),
    priceAmount: formData.get("priceAmount"),
    priceLabel: formData.get("priceLabel") ?? "",
    cancellationHours: formData.get("cancellationHours"),
    overrideReason: formData.get("overrideReason") ?? "",
  });
  if (!parsed.success) {
    redirect("/admin/agenda/confirmacao?error=invalid_request");
  }

  const supabase = await createClient();
  const cycleResult = await supabase
    .from("season_cycles")
    .select("season_id")
    .eq("id", parsed.data.cycleId)
    .maybeSingle();
  if (cycleResult.error || !cycleResult.data?.season_id) {
    redirect("/admin/agenda/confirmacao?error=SEASON_CYCLE_NOT_FOUND");
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
  if (error) fail(error.message);

  revalidatePath("/admin");
  revalidatePath("/admin/agenda");
  revalidatePath("/admin/agenda/piloto");
  revalidatePath("/admin/agenda/confirmacao");
  revalidatePath("/admin/ur-play");
  revalidatePath("/athlete/agenda");
  redirect("/admin/agenda?confirmed=ur_play");
}
