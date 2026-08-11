"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();
const incidentType = z.enum([
  "injury",
  "medical",
  "conflict",
  "behavior",
  "court_safety",
  "equipment",
  "operational",
  "other",
]);
const severity = z.enum(["low", "medium", "high", "critical"]);
const status = z.enum(["open", "monitoring", "resolved", "closed_no_action"]);

function codeFromMessage(message: string) {
  const value = message.toUpperCase();
  if (value.includes("AUTH_REQUIRED")) return "auth_required";
  if (value.includes("SESSION_OPERATION_DENIED")) return "operation_denied";
  if (value.includes("UR_PLAY_SESSION_NOT_FOUND")) return "session_not_found";
  if (value.includes("POST_SESSION_ALREADY_CLOSED")) return "already_closed";
  if (value.includes("INCIDENT")) return "incident_invalid";
  if (value.includes("ADMIN")) return "admin_required";
  return "operation_failed";
}

function fail(sessionId: string | null, message: string): never {
  const query = new URLSearchParams({ error: codeFromMessage(message) });
  if (sessionId) query.set("session", sessionId);
  redirect(`/admin/ur-play/ocorrencias?${query.toString()}`);
}

function finish(sessionId: string, success: string): never {
  for (const path of [
    "/admin/ur-play/ocorrencias",
    "/admin/ur-play/pos-sessao",
    "/admin/ur-play",
  ]) {
    revalidatePath(path);
  }
  redirect(
    `/admin/ur-play/ocorrencias?session=${encodeURIComponent(sessionId)}&success=${encodeURIComponent(success)}`,
  );
}

export async function createIncidentAction(formData: FormData) {
  await requireRole(["admin", "operator"]);
  const athleteRaw = String(formData.get("athleteId") ?? "").trim();
  const parsed = z
    .object({
      sessionId: uuid,
      athleteId: z.union([uuid, z.literal("")]),
      type: incidentType,
      severity,
      occurredAt: z.string().min(1),
      description: z.string().trim().min(5).max(2000),
      immediateAction: z.string().trim().max(1000),
      followUpRequired: z.boolean(),
      followUpNotes: z.string().trim().max(1000),
    })
    .safeParse({
      sessionId: formData.get("sessionId"),
      athleteId: athleteRaw,
      type: formData.get("type"),
      severity: formData.get("severity"),
      occurredAt: String(formData.get("occurredAt") ?? ""),
      description: String(formData.get("description") ?? ""),
      immediateAction: String(formData.get("immediateAction") ?? ""),
      followUpRequired: formData.get("followUpRequired") === "on",
      followUpNotes: String(formData.get("followUpNotes") ?? ""),
    });
  if (!parsed.success) fail(null, "INCIDENT_INVALID");

  const occurredAt = new Date(parsed.data.occurredAt);
  if (Number.isNaN(occurredAt.getTime())) fail(parsed.data.sessionId, "INCIDENT_INVALID");

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_ur_play_incident", {
    target_session: parsed.data.sessionId,
    target_match: null,
    target_athlete: parsed.data.athleteId || null,
    target_type: parsed.data.type,
    target_severity: parsed.data.severity,
    target_occurred_at: occurredAt.toISOString(),
    target_description: parsed.data.description,
    target_immediate_action: parsed.data.immediateAction || null,
    target_follow_up_required: parsed.data.followUpRequired,
    target_follow_up_notes: parsed.data.followUpNotes || null,
  });
  if (error) fail(parsed.data.sessionId, error.message);
  finish(parsed.data.sessionId, "incident_created");
}

export async function setIncidentStatusAction(formData: FormData) {
  await requireRole(["admin", "operator"]);
  const parsed = z
    .object({
      sessionId: uuid,
      incidentId: uuid,
      status,
      resolutionNotes: z.string().trim().max(1000),
      followUpNotes: z.string().trim().max(1000),
    })
    .safeParse({
      sessionId: formData.get("sessionId"),
      incidentId: formData.get("incidentId"),
      status: formData.get("status"),
      resolutionNotes: String(formData.get("resolutionNotes") ?? ""),
      followUpNotes: String(formData.get("followUpNotes") ?? ""),
    });
  if (!parsed.success) fail(null, "INCIDENT_INVALID");

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_ur_play_incident_status", {
    target_incident: parsed.data.incidentId,
    target_status: parsed.data.status,
    target_resolution_notes: parsed.data.resolutionNotes || null,
    target_follow_up_notes: parsed.data.followUpNotes || null,
  });
  if (error) fail(parsed.data.sessionId, error.message);
  finish(parsed.data.sessionId, `incident_${parsed.data.status}`);
}

export async function confirmIncidentReviewAction(formData: FormData) {
  await requireRole(["admin", "operator"]);
  const parsed = z
    .object({ sessionId: uuid, notes: z.string().trim().max(1000) })
    .safeParse({
      sessionId: formData.get("sessionId"),
      notes: String(formData.get("notes") ?? ""),
    });
  if (!parsed.success) fail(null, "INCIDENT_INVALID");

  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_ur_play_incident_review", {
    target_session: parsed.data.sessionId,
    target_notes: parsed.data.notes || null,
  });
  if (error) fail(parsed.data.sessionId, error.message);
  finish(parsed.data.sessionId, "incident_review_confirmed");
}

export async function reopenIncidentReviewAction(formData: FormData) {
  await requireRole(["admin"]);
  const parsed = z
    .object({ sessionId: uuid, reason: z.string().trim().min(10).max(500) })
    .safeParse({
      sessionId: formData.get("sessionId"),
      reason: String(formData.get("reason") ?? ""),
    });
  if (!parsed.success) fail(null, "ADMIN_REOPEN_REASON_REQUIRED");

  const supabase = await createClient();
  const { error } = await supabase.rpc("reopen_ur_play_incident_review", {
    target_session: parsed.data.sessionId,
    target_reason: parsed.data.reason,
  });
  if (error) fail(parsed.data.sessionId, error.message);
  finish(parsed.data.sessionId, "incident_review_reopened");
}
