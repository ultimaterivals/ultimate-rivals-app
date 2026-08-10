"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();

function errorCode(message: string) {
  const value = message.toUpperCase();
  if (value.includes("WAVE_TARGET_REACHED")) return "target_reached";
  if (value.includes("ATHLETE_OUTSIDE_WAVE_POLE")) return "wrong_pole";
  if (value.includes("ATHLETE_NOT_ELIGIBLE_FOR_WAVE")) return "athlete_ineligible";
  if (value.includes("WAVE_IS_CLOSED")) return "wave_closed";
  if (value.includes("ACTIVE_POLE_REQUIRED")) return "pole_required";
  if (value.includes("REASON_REQUIRED")) return "reason_required";
  if (value.includes("ADMIN_REQUIRED")) return "admin_required";
  return "operation_failed";
}

function refresh() {
  revalidatePath("/admin/atletas");
  revalidatePath("/admin/atletas/ondas");
}

function go({
  waveId,
  success,
  error,
}: {
  waveId?: string;
  success?: string;
  error?: string;
}): never {
  const query = new URLSearchParams();
  if (waveId) query.set("wave", waveId);
  if (success) query.set("success", success);
  if (error) query.set("error", error);
  redirect(`/admin/atletas/ondas?${query.toString()}`);
}

export async function createActivationWaveAction(formData: FormData) {
  await requireRole(["admin"]);
  const parsed = z
    .object({
      name: z.string().trim().min(3).max(100),
      targetSize: z.coerce.number().int().min(1).max(100),
      poleId: z.union([uuid, z.literal("")]),
      notes: z.string().trim().max(1000),
    })
    .safeParse({
      name: formData.get("name"),
      targetSize: formData.get("targetSize"),
      poleId: String(formData.get("poleId") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    });
  if (!parsed.success) go({ error: "invalid" });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_athlete_activation_wave", {
    target_name: parsed.data.name,
    target_size_value: parsed.data.targetSize,
    target_pole_id: parsed.data.poleId || null,
    target_notes: parsed.data.notes || null,
  });
  if (error) go({ error: errorCode(error.message) });
  const waveId = (data as { id?: string } | null)?.id;
  if (!waveId) go({ error: "operation_failed" });
  refresh();
  go({ waveId, success: "wave_created" });
}

export async function selectActivationWaveMemberAction(formData: FormData) {
  await requireRole(["admin"]);
  const parsed = z
    .object({
      waveId: uuid,
      athleteId: uuid,
      reason: z.string().trim().min(5).max(500),
      priority: z.coerce.number().int().min(-100).max(100),
    })
    .safeParse({
      waveId: formData.get("waveId"),
      athleteId: formData.get("athleteId"),
      reason: formData.get("reason"),
      priority: formData.get("priority") ?? 0,
    });
  if (!parsed.success) go({ error: "invalid" });

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_athlete_activation_wave_member", {
    target_wave_id: parsed.data.waveId,
    target_athlete_id: parsed.data.athleteId,
    target_selected: true,
    target_reason: parsed.data.reason,
    target_priority: parsed.data.priority,
  });
  if (error)
    go({ waveId: parsed.data.waveId, error: errorCode(error.message) });
  refresh();
  go({ waveId: parsed.data.waveId, success: "member_selected" });
}

export async function removeActivationWaveMemberAction(formData: FormData) {
  await requireRole(["admin"]);
  const parsed = z
    .object({
      waveId: uuid,
      athleteId: uuid,
      reason: z.string().trim().min(5).max(500),
    })
    .safeParse({
      waveId: formData.get("waveId"),
      athleteId: formData.get("athleteId"),
      reason: formData.get("reason"),
    });
  if (!parsed.success) go({ error: "invalid" });

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_athlete_activation_wave_member", {
    target_wave_id: parsed.data.waveId,
    target_athlete_id: parsed.data.athleteId,
    target_selected: false,
    target_reason: parsed.data.reason,
    target_priority: 0,
  });
  if (error)
    go({ waveId: parsed.data.waveId, error: errorCode(error.message) });
  refresh();
  go({ waveId: parsed.data.waveId, success: "member_removed" });
}

export async function updateActivationWaveStatusAction(formData: FormData) {
  await requireRole(["admin"]);
  const parsed = z
    .object({
      waveId: uuid,
      status: z.enum(["draft", "preparing", "running", "completed", "cancelled"]),
      reason: z.string().trim().min(5).max(500),
    })
    .safeParse({
      waveId: formData.get("waveId"),
      status: formData.get("status"),
      reason: formData.get("reason"),
    });
  if (!parsed.success) go({ error: "invalid" });

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_athlete_activation_wave_status", {
    target_wave_id: parsed.data.waveId,
    target_status: parsed.data.status,
    target_reason: parsed.data.reason,
  });
  if (error)
    go({ waveId: parsed.data.waveId, error: errorCode(error.message) });
  refresh();
  go({ waveId: parsed.data.waveId, success: "status_updated" });
}
