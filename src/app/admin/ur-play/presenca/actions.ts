"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const registrationSchema = z.string().uuid();

function attendanceError(message: string) {
  const codes = [
    "AUTH_REQUIRED",
    "OPERATION_ID_REQUIRED",
    "UR_PLAY_REGISTRATION_NOT_FOUND",
    "UR_PLAY_REGISTRATION_NOT_CONFIRMED",
    "UR_PLAY_ALREADY_NO_SHOW",
    "UR_PLAY_ALREADY_CHECKED_IN",
    "UR_PLAY_SESSION_NOT_FOUND",
    "NO_SHOW_BEFORE_SESSION_START",
    "OPERATION_DENIED",
    "CHECKIN_METHOD_NOT_CONFIGURED",
    "ACTIVITY_RESERVATION_CANCELLED",
    "RESERVATION_CREDIT_HOLD_NOT_FOUND",
  ];
  return codes.find((code) => message.includes(code)) ?? "attendance_failed";
}

function fail(sessionId: string | null, message: string): never {
  const query = new URLSearchParams({ error: attendanceError(message) });
  if (sessionId) query.set("session", sessionId);
  redirect(`/admin/ur-play/presenca?${query.toString()}`);
}

function finish(sessionId: string, success: string): never {
  revalidatePath("/admin/ur-play");
  revalidatePath("/admin/ur-play/presenca");
  revalidatePath("/athlete");
  revalidatePath("/athlete/agenda");
  redirect(
    `/admin/ur-play/presenca?session=${encodeURIComponent(sessionId)}&success=${encodeURIComponent(success)}`,
  );
}

async function sessionForRegistration(registrationId: string) {
  const supabase = await createClient();
  const result = await supabase
    .from("ur_play_registrations")
    .select("session_id")
    .eq("id", registrationId)
    .maybeSingle();
  return {
    supabase,
    sessionId: result.data?.session_id ?? null,
    error: result.error,
  };
}

export async function manualCheckinAction(formData: FormData) {
  await requireRole(["admin", "operator"]);
  const parsed = registrationSchema.safeParse(formData.get("registrationId"));
  if (!parsed.success) fail(null, "invalid_request");

  const lookup = await sessionForRegistration(parsed.data);
  if (lookup.error || !lookup.sessionId) {
    fail(null, lookup.error?.message ?? "UR_PLAY_REGISTRATION_NOT_FOUND");
  }

  const { error } = await lookup.supabase.rpc("admin_manual_checkin_ur_play", {
    p_registration_id: parsed.data,
    p_operation_id: randomUUID(),
  });
  if (error) fail(lookup.sessionId, error.message);
  finish(lookup.sessionId, "checked_in");
}

export async function markNoShowAction(formData: FormData) {
  await requireRole(["admin", "operator"]);
  const parsed = registrationSchema.safeParse(formData.get("registrationId"));
  if (!parsed.success) fail(null, "invalid_request");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);

  const lookup = await sessionForRegistration(parsed.data);
  if (lookup.error || !lookup.sessionId) {
    fail(null, lookup.error?.message ?? "UR_PLAY_REGISTRATION_NOT_FOUND");
  }

  const { error } = await lookup.supabase.rpc("admin_mark_ur_play_no_show", {
    p_registration_id: parsed.data,
    p_operation_id: randomUUID(),
    p_reason: reason || null,
  });
  if (error) fail(lookup.sessionId, error.message);
  finish(lookup.sessionId, "no_show");
}
