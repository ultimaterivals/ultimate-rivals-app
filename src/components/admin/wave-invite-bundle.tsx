"use client";

import { useActionState, useState } from "react";
import { Copy, Link2, ShieldAlert } from "lucide-react";
import { issueActivationWaveInviteBundleAction } from "@/app/admin/atletas/ondas/actions";
import type { WaveInviteBundleState } from "@/features/admin-athlete-waves/types";

const initialState: WaveInviteBundleState = {
  status: "idle",
  invites: [],
  message: null,
};

export function WaveInviteBundle({
  waveId,
  eligibleCount,
  selectionComplete,
}: {
  waveId: string;
  eligibleCount: number;
  selectionComplete: boolean;
}) {
  const [state, action, pending] = useActionState(
    issueActivationWaveInviteBundleAction,
    initialState,
  );
  const [copied, setCopied] = useState<string | null>(null);

  function absolute(path: string) {
    return new URL(path, window.location.origin).toString();
  }

  async function copyOne(athleteId: string, path: string) {
    await navigator.clipboard.writeText(absolute(path));
    setCopied(athleteId);
    window.setTimeout(() => setCopied(null), 1800);
  }

  async function copyAll() {
    const text = state.invites
      .map((invite) => `${invite.publicName}: ${absolute(invite.invitePath)}`)
      .join("\n");
    await navigator.clipboard.writeText(text);
    setCopied("all");
    window.setTimeout(() => setCopied(null), 1800);
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-start gap-3">
        <Link2 className="text-ur-gold mt-0.5 shrink-0" size={19} aria-hidden="true" />
        <div>
          <p className="font-display text-lg font-black uppercase">
            2. Gerar pacote de primeiros acessos
          </p>
          <p className="mt-1 text-sm leading-6 text-zinc-500">
            Gera ou renova, em uma única transação, os convites dos atletas
            selecionados que já estão ativos e ainda não vincularam conta. O sistema não
            envia mensagens automaticamente.
          </p>
        </div>
      </div>

      {!selectionComplete && (
        <div className="rounded-ur flex gap-2 border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-200">
          <ShieldAlert className="mt-0.5 shrink-0" size={16} aria-hidden="true" />
          Complete o tamanho alvo da onda antes de gerar acessos em lote.
        </div>
      )}

      {selectionComplete && eligibleCount === 0 && state.status !== "success" && (
        <p className="rounded-ur border p-3 text-sm text-zinc-500">
          Nenhum integrante está simultaneamente ativo e sem conta. Homologue o grupo
          primeiro ou aguarde quem já recebeu acesso concluir o vínculo.
        </p>
      )}

      {selectionComplete && eligibleCount > 0 && state.status !== "success" && (
        <form action={action} className="grid gap-3">
          <input type="hidden" name="waveId" value={waveId} />
          <div className="grid gap-3 md:grid-cols-[140px_1fr]">
            <label className="grid gap-1 text-xs font-bold text-zinc-500 uppercase">
              Validade
              <select
                name="expiresDays"
                defaultValue="7"
                className="rounded-ur border bg-black/30 px-3 py-3 text-sm text-white"
              >
                <option value="3">3 dias</option>
                <option value="7">7 dias</option>
                <option value="14">14 dias</option>
                <option value="30">30 dias</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-bold text-zinc-500 uppercase">
              Motivo operacional
              <input
                name="reason"
                required
                minLength={5}
                maxLength={500}
                placeholder="Ex.: liberar primeiro acesso da onda piloto após homologação"
                className="rounded-ur border bg-black/30 px-3 py-3 text-sm text-white"
              />
            </label>
          </div>
          <label className="grid gap-1 text-xs font-bold text-zinc-500 uppercase">
            Confirmação
            <input
              name="confirmation"
              required
              autoComplete="off"
              placeholder="Digite GERAR LINKS"
              className="rounded-ur border bg-black/30 px-3 py-3 text-sm text-white"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-ur border-ur-gold/30 text-ur-gold border px-4 py-3 text-sm font-black uppercase disabled:opacity-50"
          >
            {pending
              ? "Gerando pacote…"
              : `Gerar ${eligibleCount} acesso(s) sem enviar`}
          </button>
        </form>
      )}

      {state.message && (
        <p
          className={`rounded-ur border p-3 text-sm ${
            state.status === "success"
              ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-200"
              : "border-red-500/30 bg-red-500/5 text-red-200"
          }`}
        >
          {state.message}
        </p>
      )}

      {state.status === "success" && state.invites.length > 0 && (
        <div className="rounded-ur border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-bold text-amber-100">Links de exibição única</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Após atualizar ou sair desta página, estes tokens brutos não poderão ser
                recuperados do banco. Um novo pacote revoga convites anteriores ainda não
                usados.
              </p>
            </div>
            <button
              type="button"
              onClick={copyAll}
              className="rounded-ur flex items-center gap-2 border border-amber-500/30 px-3 py-2 text-xs font-bold text-amber-200 uppercase"
            >
              <Copy size={14} aria-hidden="true" />
              {copied === "all" ? "Copiado" : "Copiar todos"}
            </button>
          </div>

          <div className="mt-4 grid gap-2">
            {state.invites.map((invite) => (
              <div
                key={invite.athleteId}
                className="rounded-ur flex flex-wrap items-center gap-3 border bg-black/20 px-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white">{invite.publicName}</p>
                  <p className="text-xs text-zinc-600">{invite.athleteCode}</p>
                </div>
                <button
                  type="button"
                  onClick={() => copyOne(invite.athleteId, invite.invitePath)}
                  className="rounded-ur flex items-center gap-2 border px-3 py-2 text-xs font-bold text-zinc-300 uppercase"
                >
                  <Copy size={13} aria-hidden="true" />
                  {copied === invite.athleteId ? "Copiado" : "Copiar link"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
