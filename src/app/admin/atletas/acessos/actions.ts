"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type InviteActionState = {
  status: "idle" | "success" | "error";
  invitePath: string | null;
  expiresAt: string | null;
  message: string | null;
};

const issueSchema = z.object({
  athleteId: z.string().uuid(),
  expiresDays: z.coerce.number().int().min(1).max(30),
});

const revokeSchema = z.object({ inviteId: z.string().uuid() });

function issueErrorMessage(message: string) {
  if (message.includes("ATHLETE_ALREADY_LINKED")) {
    return "Este atleta já possui uma conta vinculada.";
  }
  if (message.includes("ATHLETE_NOT_ACTIVE")) {
    return "Somente atletas ativos podem receber convite.";
  }
  if (message.includes("ATHLETE_NOT_FOUND")) {
    return "Atleta não encontrado.";
  }
  if (message.includes("INVALID_INVITE_EXPIRY")) {
    return "Validade do convite inválida.";
  }
  return "Não foi possível emitir o convite. Nenhum token foi persistido no navegador.";
}

export async function issueAthleteInviteAction(
  _previousState: InviteActionState,
  formData: FormData,
): Promise<InviteActionState> {
  await requireRole(["admin"]);
  const parsed = issueSchema.safeParse({
    athleteId: formData.get("athleteId"),
    expiresDays: formData.get("expiresDays"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      invitePath: null,
      expiresAt: null,
      message: "Revise o atleta e a validade do convite.",
    };
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(
    Date.now() + parsed.data.expiresDays * 24 * 60 * 60 * 1000,
  );

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_issue_athlete_access_invite", {
    p_athlete_id: parsed.data.athleteId,
    p_token_hash: tokenHash,
    p_expires_at: expiresAt.toISOString(),
  });
  if (error) {
    return {
      status: "error",
      invitePath: null,
      expiresAt: null,
      message: issueErrorMessage(error.message),
    };
  }

  revalidatePath("/admin/atletas/acessos");
  return {
    status: "success",
    invitePath: `/claim?token=${rawToken}`,
    expiresAt: expiresAt.toISOString(),
    message:
      "Convite emitido. Este link é mostrado agora porque o token bruto não fica armazenado no banco.",
  };
}

export async function revokeAthleteInviteAction(formData: FormData) {
  await requireRole(["admin"]);
  const parsed = revokeSchema.safeParse({ inviteId: formData.get("inviteId") });
  if (!parsed.success) return;

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_revoke_athlete_access_invite", {
    p_invite_id: parsed.data.inviteId,
  });
  if (error && !error.message.includes("INVITE_ALREADY_USED")) {
    throw new Error("Não foi possível revogar o convite.");
  }
  revalidatePath("/admin/atletas/acessos");
}
