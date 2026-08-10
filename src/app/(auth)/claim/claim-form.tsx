"use client";

import { useActionState } from "react";
import {
  claimAthleteAccessAction,
  initialClaimActionState,
} from "@/app/(auth)/claim/actions";
import { Button } from "@/components/ui";

export function ClaimAthleteForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(
    claimAthleteAccessAction,
    initialClaimActionState,
  );

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="token" value={token} />
      <div className="rounded-ur border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm leading-6 text-zinc-300">
        Sua conta está autenticada. Ao confirmar, ela será vinculada ao cadastro esportivo indicado neste convite e passará a acessar o Portal do Atleta.
      </div>
      {state.message && (
        <p
          role="alert"
          className="rounded-ur border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
        >
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Concluindo…" : "Concluir primeiro acesso"}
      </Button>
    </form>
  );
}
