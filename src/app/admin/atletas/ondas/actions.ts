"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { WaveInviteBundleState } from "@/features/admin-athlete-waves/types";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();

function errorCode(message: string) {
  const value = message.toUpperCase();
  if (value.includes("WAVE_TARGET_REACHED")) return "target_reached";
  if (value.includes("WAVE_TARGET_NOT_FILLED")) return "target_not_filled";
  if (value.includes("ATHLETE_OUTSIDE_WAVE_POLE")) return "wrong_pole";
  if (value.includes("ATHLETE_NOT_ELIGIBLE_FOR_WAVE"))
    return "athlete_ineligible";
  if (value.includes("WAVE_MEMBER_NOT_ACTIVATABLE"))
    return "member_not_activatable";
  if (value.includes("ATHLETE_ACTIVATION_BLOCKED"))
    return "activation_blocked";
  if (value.includes("WAVE_IS_CLOSED")) return "wave_closed";
  if (value.includes("ACTIVE_POLE_REQUIRED")) return "pole_required";
  if (value.includes("REASON_REQUIRED")) return "reason_required";
  if (value.includes("ADMIN_REQUIRED")) return "admin_required";
  return "operation_failed";
}

function inviteErrorMessage(message: string) {
  const value = message.toUpperCase();
  if (value.includes("WAVE_TARGET_NOT_FILLED")) {
    return "Complete a seleção da onda antes de gerar o pacote de acessos.";
  }
  if (value.includes("WAVE_IS_CLOSED")) {
    return "Esta onda está encerrada e não pode gerar novos acessos.";
  }
  if (value.includes("ATHLETE_NOT_ACTIVE")) {
    return "Todos os destinatários precisam estar homologados antes da emissão.";
  }
  if (value.includes("ATHLETE_ALREADY_LINKED")) {
    return "Há atleta que já vinculou a conta; atualize a página e gere o pacote apenas para quem falta.";
  }
  if (value.includes("ATHLETE_NOT_IN_ACTIVE_WAVE")) {
    return "O pacote contém atleta que não pertence mais à onda ativa.";
  }
  return "Não foi possível gerar o pacote. Nenhum token bruto foi persistido pelo navegador.";
}

function refresh() {
  revalidatePath("/admin");
  revalidatePath("/admin/atletas");
  revalidatePath("/admin/atletas/ondas");
  revalidatePath("/admin/atletas/homologacao");
  revalidatePath("/admin/atletas/acessos");
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
      status: z.enum([
        "draft",
        "preparing",
        "running",
        "completed",
        "cancelled",
      ]),
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

export async function activateActivationWaveBatchAction(formData: FormData) {
  await requireRole(["admin"]);
  const parsed = z
    .object({
      waveId: uuid,
      confirmation: z.literal("HOMOLOGAR"),
      reason: z.string().trim().min(5).max(500),
    })
    .safeParse({
      waveId: formData.get("waveId"),
      confirmation: formData.get("confirmation"),
      reason: formData.get("reason"),
    });
  if (!parsed.success) go({ error: "invalid" });

  const supabase = await createClient();
  const { error } = await supabase.rpc("activate_athlete_activation_wave", {
    target_wave_id: parsed.data.waveId,
    target_reason: parsed.data.reason,
  });
  if (error)
    go({ waveId: parsed.data.waveId, error: errorCode(error.message) });

  refresh();
  go({ waveId: parsed.data.waveId, success: "wave_activated" });
}

export async function issueActivationWaveInviteBundleAction(
  _previousState: WaveInviteBundleState,
  formData: FormData,
): Promise<WaveInviteBundleState> {
  await requireRole(["admin"]);
  const parsed = z
    .object({
      waveId: uuid,
      expiresDays: z.coerce.number().int().min(1).max(30),
      confirmation: z.literal("GERAR LINKS"),
      reason: z.string().trim().min(5).max(500),
    })
    .safeParse({
      waveId: formData.get("waveId"),
      expiresDays: formData.get("expiresDays"),
      confirmation: formData.get("confirmation"),
      reason: formData.get("reason"),
    });
  if (!parsed.success) {
    return {
      status: "error",
      invites: [],
      message: "Confirme a ação, a validade e o motivo operacional.",
    };
  }

  const supabase = await createClient();
  const membersResult = await supabase
    .from("athlete_activation_wave_members")
    .select("athlete_id")
    .eq("wave_id", parsed.data.waveId)
    .is("removed_at", null);
  if (membersResult.error) {
    return {
      status: "error",
      invites: [],
      message: "Não foi possível ler os integrantes atuais da onda.",
    };
  }

  const athleteIds = [
    ...new Set((membersResult.data ?? []).map((member) => member.athlete_id)),
  ];
  if (athleteIds.length === 0) {
    return {
      status: "error",
      invites: [],
      message: "A onda não possui atletas selecionados.",
    };
  }

  const athletesResult = await supabase
    .from("athletes")
    .select("id,athlete_code,public_name,status,profile_id")
    .in("id", athleteIds);
  if (athletesResult.error) {
    return {
      status: "error",
      invites: [],
      message: "Não foi possível validar os atletas da onda.",
    };
  }

  const eligible = (athletesResult.data ?? [])
    .filter((athlete) => athlete.status === "active" && !athlete.profile_id)
    .sort((a, b) => a.public_name.localeCompare(b.public_name));
  if (eligible.length === 0) {
    return {
      status: "error",
      invites: [],
      message: "Nenhum atleta selecionado está ativo e sem conta vinculada.",
    };
  }

  const expiresAt = new Date(
    Date.now() + parsed.data.expiresDays * 24 * 60 * 60 * 1000,
  );
  const generated = eligible.map((athlete) => {
    const rawToken = randomBytes(32).toString("hex");
    return {
      athleteId: athlete.id,
      athleteCode: athlete.athlete_code,
      publicName: athlete.public_name,
      rawToken,
      tokenHash: createHash("sha256").update(rawToken).digest("hex"),
    };
  });

  const { error } = await supabase.rpc("issue_athlete_activation_wave_invites", {
    target_wave_id: parsed.data.waveId,
    target_invites: generated.map((item) => ({
      athlete_id: item.athleteId,
      token_hash: item.tokenHash,
      expires_at: expiresAt.toISOString(),
    })),
    target_reason: parsed.data.reason,
  });
  if (error) {
    return {
      status: "error",
      invites: [],
      message: inviteErrorMessage(error.message),
    };
  }

  refresh();
  return {
    status: "success",
    invites: generated.map((item) => ({
      athleteId: item.athleteId,
      athleteCode: item.athleteCode,
      publicName: item.publicName,
      invitePath: `/claim?token=${item.rawToken}`,
      expiresAt: expiresAt.toISOString(),
    })),
    message:
      "Pacote criado. Os links abaixo são a única exibição dos tokens brutos; salvar ou enviar é uma ação humana.",
  };
}
