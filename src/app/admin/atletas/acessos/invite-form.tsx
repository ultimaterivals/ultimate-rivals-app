"use client";

import { useActionState, useState } from "react";
import {
  initialInviteActionState,
  issueAthleteInviteAction,
} from "@/app/admin/atletas/acessos/actions";
import { Button } from "@/components/ui";

export function AthleteInviteForm({
  athleteId,
  hasActiveInvite = false,
}: {
  athleteId: string;
  hasActiveInvite?: boolean;
}) {
  const [state, action, pending] = useActionState(
    issueAthleteInviteAction,
    initialInviteActionState,
  );
  const [copied, setCopied] = useState(false);

  async function copyInvite() {
    if (!state.invitePath) return;
    const url = `${window.location.origin}${state.invitePath}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="grid gap-3">
      <form action={action} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="athleteId" value={athleteId} />
        <label className="grid gap-1 text-xs font-bold text-zinc-500 uppercase">
          Validade
          <select
            name="expiresDays"
            defaultValue="7"
            className="rounded-ur bg-ur-black min-h-10 border px-3 text-sm text-white"
          >
            <option value="1">1 dia</option>
            <option value="3">3 dias</option>
            <option value="7">7 dias</option>
            <option value="14">14 dias</option>
            <option value="30">30 dias</option>
          </select>
        </label>
        <Button type="submit" size="sm" disabled={pending}>
          {pending
            ? "Emitindo..."
            : hasActiveInvite
              ? "Renovar acesso"
              : "Gerar primeiro acesso"}
        </Button>
      </form>

      {hasActiveInvite && state.status === "idle" && (
        <p className="text-xs leading-5 text-zinc-500">
          Renovar cria um novo token e revoga automaticamente o convite anterior.
        </p>
      )}

      {state.message && (
        <p
          className={`text-xs leading-5 ${state.status === "error" ? "text-red-300" : "text-zinc-500"}`}
        >
          {state.message}
        </p>
      )}

      {state.status === "success" && state.invitePath && (
        <div className="rounded-ur border-ur-gold/30 grid gap-2 border p-3">
          <p className="text-xs font-bold text-zinc-500 uppercase">
            Link de uso único
          </p>
          <code className="break-all text-xs text-zinc-300">
            {state.invitePath}
          </code>
          <Button type="button" size="sm" variant="secondary" onClick={copyInvite}>
            {copied ? "Copiado" : "Copiar link completo"}
          </Button>
        </div>
      )}
    </div>
  );
}
