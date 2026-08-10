"use server";

import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ClaimActionState = {
  status: "idle" | "error";
  message: string | null;
};

export const initialClaimActionState: ClaimActionState = {
  status: "idle",
  message: null,
};

const schema = z.object({ token: z.string().regex(/^[0-9a-f]{64}$/i) });

function errorMessage(message: string) {
  if (message.includes("INVITE_NOT_FOUND")) return "Convite não encontrado.";
  if (message.includes("INVITE_REVOKED")) return "Este convite foi revogado.";
  if (message.includes("INVITE_EXPIRED"))
    return "Este convite expirou. Solicite um novo acesso ao UR.";
  if (message.includes("INVITE_ALREADY_USED"))
    return "Este convite já foi utilizado por outra conta.";
  if (message.includes("ATHLETE_ALREADY_LINKED"))
    return "Este atleta já está vinculado a outra conta.";
  if (message.includes("PROFILE_ALREADY_LINKED_TO_ATHLETE"))
    return "Esta conta já está vinculada a outro atleta.";
  if (message.includes("PROFILE_ROLE_NOT_CLAIMABLE"))
    return "Esta conta possui um papel administrativo e não pode assumir um cadastro de atleta.";
  if (message.includes("ATHLETE_NOT_ACTIVE"))
    return "O cadastro esportivo não está ativo.";
  if (message.includes("AUTH_REQUIRED"))
    return "Entre na sua conta antes de concluir o vínculo.";
  return "Não foi possível concluir o primeiro acesso. O cadastro esportivo não foi alterado.";
}

export async function claimAthleteAccessAction(
  _previousState: ClaimActionState,
  formData: FormData,
): Promise<ClaimActionState> {
  const parsed = schema.safeParse({ token: formData.get("token") });
  if (!parsed.success) {
    return { status: "error", message: "Link de primeiro acesso inválido." };
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return {
      status: "error",
      message: "Entre na sua conta antes de concluir o vínculo.",
    };
  }

  const tokenHash = createHash("sha256")
    .update(parsed.data.token)
    .digest("hex");
  const { error } = await supabase.rpc("claim_athlete_access", {
    p_token_hash: tokenHash,
  });
  if (error) return { status: "error", message: errorMessage(error.message) };

  await supabase.auth.refreshSession();
  redirect("/athlete");
}
