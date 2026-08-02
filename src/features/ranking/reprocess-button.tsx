"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { reprocessRankingAction } from "./actions";

export function ReprocessButton({ matchId }: { matchId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return (
    <div className="grid justify-items-end gap-2">
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            try {
              const run = await reprocessRankingAction({
                matchId,
                operationId: crypto.randomUUID(),
              });
              setMessage(
                run.transaction_count === 0
                  ? "Sem duplicação: entrada inalterada."
                  : `${run.transaction_count} transações processadas.`,
              );
            } catch (error) {
              setMessage(
                error instanceof Error
                  ? error.message
                  : "Falha ao reprocessar.",
              );
            }
          })
        }
      >
        {pending ? "PROCESSANDO…" : "REPROCESSAR PONTUAÇÃO"}
      </Button>
      {message && <p className="text-xs text-zinc-400">{message}</p>}
    </div>
  );
}
