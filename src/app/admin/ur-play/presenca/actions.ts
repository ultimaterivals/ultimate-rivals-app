"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const registrationSchema = z.string().uuid();
const sessionTransitionSchema = z.object({
  sessionId: z.string().uuid(),
  targetStatus: z.enum(["registration_closed", "checkin_open"]),
});
const startSchema = z.object({
  sessionId: z.string().uuid(),
  confirmation: z.literal("INICIAR"),
  overrideReason: z.string().trim().max(500),
});

function attendanceError(message: string) {
  if (message === "invalid_request") return "invalid_request";
  const normalized = message.toUpperCase();
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
    "SESSION_OPERATION_DENIED",
    "CHECKIN_METHOD_NOT_CONFIGURED",
    "ACTIVITY_RESERVATION_CANCELLED",
    "RESERVATION_CREDIT_HOLD_NOT_FOUND",
    "UR_PLAY_START_NOT_READY",
    "UR_PLAY_START_REQUIRES_CHECKIN_OPEN",
    "ADMIN_START_OVERRIDE_REASON_REQUIRED",
  ];
  if (normalized.includes("INVALID SESSION TRANSITION")) {
    return "INVALID_SESSION_TRANSITION";
  }
  if (normalized.includes("SESSION OPERATION DENIED")) {
    return "SESSION_OPERATION_DENIED";
  }
  return codes.find((code) => normalized.includes(code)) ?? "attendance_failed";
}

function fail(sessionId: string | null, message: string): never {
  const query = new URLSearchParams({ error: attendanceError(message) });
  if (sessionId) query.set("session", sessionId);
  redirect(`/admin/ur-play/presenca?${query.toString()}`);
}

function finish(sessionId: string, success: string): never {
  revalidatePath("/admin");
  revalidatePath("/admin/ur-play");
  revalidatePath("/admin/ur-play/preflight");
  revalidatePath("/admin/ur-play/presenca");
  revalidatePath("/admin/ur-play/quadra");
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

export async function advanceAttendanceSessionAction(formData: FormData) {
  await requireRole(["admin", "operator"]);
  const parsed = sessionTransitionSchema.safeParse({
    sessionId: formData.get("sessionId"),
    targetStatus: formData.get("targetStatus"),
  });
  if (!parsed.success) fail(null, "invalid_request");

  const supabase = await createClient();
  const { error } = await supabase.rpc("transition_ur_play_session", {
    target_session_id: parsed.data.sessionId,
    target_status: parsed.data.targetStatus,
    cancel_reason: null,
  });
  if (error) fail(parsed.data.sessionId, error.message);
  finish(parsed.data.sessionId, `session_${parsed.data.targetStatus}`);
}

export async function startUrPlaySessionAction(formData: FormData) {
  await requireRole(["admin", "operator"]);
  const parsed = startSchema.safeParse({
    sessionId: formData.get("sessionId"),
    confirmation: formData.get("confirmation"),
    overrideReason: formData.get("overrideReason") ?? "",
  });
  if (!parsed.success) fail(null, "invalid_request");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_ur_play_session", {
    target_session_id: parsed.data.sessionId,
    override_reason: parsed.data.overrideReason || null,
  });
  if (error) fail(parsed.data.sessionId, error.message);

  const overridden = Boolean(
    data && typeof data === "object" && "overridden" in data && data.overridden,
  );
  finish(
    parsed.data.sessionId,
    overridden ? "session_started_override" : "session_started",
  );
}
