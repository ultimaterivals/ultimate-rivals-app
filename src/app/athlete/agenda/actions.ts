"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.string().uuid();
const interestModeSchema = z.enum([
  "have_formation",
  "looking_for_partner",
  "available_to_join",
  "individual_interest",
]);

function rpcErrorCode(message: string) {
  const known = [
    "ATHLETE_PROFILE_REQUIRED",
    "OPPORTUNITY_NOT_FOUND",
    "OPPORTUNITY_NOT_ACCEPTING_INTEREST",
    "OPPORTUNITY_ALREADY_STARTED",
    "INVALID_INTEREST_MODE",
    "OPPORTUNITY_NOT_RESERVABLE",
    "OPPORTUNITY_ALREADY_STARTED_OR_UNSCHEDULED",
    "NO_AVAILABLE_CREDITS",
    "RESERVATION_NOT_FOUND",
    "RESERVATION_ACCESS_DENIED",
    "RESERVATION_ALREADY_CONSUMED",
    "RESERVATION_CREDIT_HOLD_NOT_FOUND",
  ];
  return known.find((code) => message.includes(code)) ?? "transaction_failed";
}

function finish(success: string) {
  revalidatePath("/athlete");
  revalidatePath("/athlete/agenda");
  redirect(`/athlete/agenda?success=${encodeURIComponent(success)}`);
}

function fail(message: string) {
  redirect(
    `/athlete/agenda?error=${encodeURIComponent(rpcErrorCode(message))}`,
  );
}

export async function setAthleteOpportunityInterest(formData: FormData) {
  await requireRole(["athlete"]);
  const opportunityId = idSchema.safeParse(formData.get("opportunityId"));
  const active = formData.get("active") === "true";
  const mode = interestModeSchema.safeParse(
    formData.get("interestMode") ?? "individual_interest",
  );

  if (!opportunityId.success || !mode.success) {
    redirect("/athlete/agenda?error=invalid_request");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_activity_interest", {
    p_opportunity_id: opportunityId.data,
    p_active: active,
    p_interest_mode: mode.data,
  });

  if (error) fail(error.message);
  finish(active ? "interest_saved" : "interest_removed");
}

export async function reserveAthleteOpportunity(formData: FormData) {
  await requireRole(["athlete"]);
  const opportunityId = idSchema.safeParse(formData.get("opportunityId"));
  if (!opportunityId.success) {
    redirect("/athlete/agenda?error=invalid_request");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reserve_activity_opportunity", {
    p_opportunity_id: opportunityId.data,
    p_operation_id: randomUUID(),
  });

  if (error) fail(error.message);

  const result = Array.isArray(data) ? data[0] : data;
  const status = result?.reservation_status;
  finish(status === "waitlisted" ? "waitlisted" : "reserved");
}

export async function cancelAthleteReservation(formData: FormData) {
  await requireRole(["athlete"]);
  const reservationId = idSchema.safeParse(formData.get("reservationId"));
  if (!reservationId.success) {
    redirect("/athlete/agenda?error=invalid_request");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cancel_activity_reservation", {
    p_reservation_id: reservationId.data,
    p_operation_id: randomUUID(),
    p_reason: "Cancelamento solicitado pelo atleta no portal",
  });

  if (error) fail(error.message);

  const result = Array.isArray(data) ? data[0] : data;
  const creditResult = result?.credit_result;
  finish(creditResult === "consumed" ? "cancelled_consumed" : "cancelled");
}
