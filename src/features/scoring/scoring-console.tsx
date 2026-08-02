"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card } from "@/components/ui";
import {
  correctRallyAction,
  homologateMatchAction,
  recordRallyAction,
  recordTechnicalActionAction,
  requestMatchCorrectionAction,
  submitMatchForReviewAction,
  voidMatchAction,
} from "@/features/scoring/actions";

type Side = {
  id: string;
  side: string;
  label: string;
  participants: { athleteId: string; name: string; code: string }[];
};
type Scoreboard = {
  score_a: number;
  score_b: number;
  next_rally_number: number;
  valid_rallies: number;
  is_game_over: boolean;
  winner_side_id: string | null;
};
type Rally = {
  id: string;
  rally_number: number;
  effective_winning_side_id: string | null;
  effective_status: string;
  latest_correction_reason: string | null;
};
type TechnicalAction = {
  rally_id: string;
  athlete_id: string | null;
  action_type: string | null;
  status: string;
};
type ResultVersion = {
  id: string;
  version_number: number;
  score_a: number;
  score_b: number;
  result_status: string;
  reason: string;
  created_at: string;
};
type Summary = {
  athlete_id: string;
  aces: number;
  attacks: number;
  blocks: number;
  defenses: number;
  assists: number;
};

const actionLabels = {
  ace: "ACE",
  attack: "ATAQUE",
  block: "BLOQUEIO",
  defense: "DEFESA",
  assist: "ASSIST",
} as const;

const operationId = () => crypto.randomUUID();
const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Não foi possível concluir a operação.";

export function ScoringConsole({
  matchId,
  matchStatus,
  scoreboard,
  sides,
  rallies,
  actions,
  result,
  versions,
  summary,
  gamePointRallyNumber,
  canScore,
  canHomologate,
  isAdmin,
}: {
  matchId: string;
  matchStatus: string;
  scoreboard: Scoreboard;
  sides: Side[];
  rallies: Rally[];
  actions: TechnicalAction[];
  result: { result_status: string } | null;
  versions: ResultVersion[];
  summary: Summary[];
  gamePointRallyNumber: number | null;
  canScore: boolean;
  canHomologate: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimisticScore, setOptimisticScore] = useState<{
    a: number;
    b: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("Correção operacional do último lance");
  const [selectedAction, setSelectedAction] = useState<
    keyof typeof actionLabels | null
  >(null);
  const [athleteId, setAthleteId] = useState("");

  const orderedSides = useMemo(
    () => [...sides].sort((a, b) => a.side.localeCompare(b.side)),
    [sides],
  );
  const sideA = orderedSides[0]!;
  const sideB = orderedSides[1]!;
  const latestRally = rallies[0];
  const latestSide = orderedSides.find(
    (side) => side.id === latestRally?.effective_winning_side_id,
  );
  const eligibleAthletes = useMemo(
    () => latestSide?.participants ?? [],
    [latestSide],
  );
  const selectedAthleteId =
    athleteId &&
    eligibleAthletes.some((athlete) => athlete.athleteId === athleteId)
      ? athleteId
      : (eligibleAthletes[0]?.athleteId ?? "");
  const latestAction = actions.find(
    (action) => action.rally_id === latestRally?.id,
  );
  const locked = matchStatus !== "in_progress" || scoreboard.is_game_over;

  const run = (task: () => Promise<unknown>, optimistic?: "A" | "B") => {
    setError(null);
    if (optimistic) {
      setOptimisticScore((current) => ({
        a: (current?.a ?? scoreboard.score_a) + (optimistic === "A" ? 1 : 0),
        b: (current?.b ?? scoreboard.score_b) + (optimistic === "B" ? 1 : 0),
      }));
    }
    startTransition(async () => {
      try {
        await task();
        setOptimisticScore(null);
        router.refresh();
      } catch (caught) {
        setOptimisticScore(null);
        setError(errorMessage(caught));
      }
    });
  };

  const recordPoint = (side: Side) =>
    run(
      () =>
        recordRallyAction({
          matchId,
          winningSideId: side.id,
          expectedRallyNumber: scoreboard.next_rally_number,
          clientSequence: scoreboard.next_rally_number,
          clientRecordedAt: new Date().toISOString(),
          operationId: operationId(),
        }),
      side.side === "A" ? "A" : "B",
    );

  return (
    <section className="grid gap-5" aria-label="Scoring do jogo">
      <Card className="border-ur-gold grid gap-5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
          {[sideA, sideB].map((side, index) => (
            <div key={side.id} className={index === 1 ? "col-start-3" : ""}>
              <p className="text-ur-gold text-sm font-black">
                LADO {side.side}
              </p>
              <p className="min-h-10 text-xs text-zinc-400">
                {side.participants.map((athlete) => athlete.name).join(" / ")}
              </p>
              <strong className="text-6xl tabular-nums">
                <span data-testid={`score-${side.side.toLowerCase()}`}>
                  {side.side === "A"
                    ? (optimisticScore?.a ?? scoreboard.score_a)
                    : (optimisticScore?.b ?? scoreboard.score_b)}
                </span>
              </strong>
            </div>
          ))}
          <span className="col-start-2 row-start-1 text-sm font-black text-zinc-500">
            VS
          </span>
        </div>

        {canScore && !locked && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              className="min-h-20 text-lg"
              disabled={pending}
              onClick={() => recordPoint(sideA)}
              data-testid="point-a"
            >
              + PONTO A
            </Button>
            <Button
              className="min-h-20 text-lg"
              disabled={pending}
              onClick={() => recordPoint(sideB)}
              data-testid="point-b"
            >
              + PONTO B
            </Button>
          </div>
        )}
        {pending && (
          <p className="text-center text-sm text-zinc-400">
            Sincronizando com o placar oficial…
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-300">
            {error}
          </p>
        )}
      </Card>

      {latestRally && (
        <Card className="grid gap-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-black">
                ÚLTIMO PONTO · RALLY {latestRally.rally_number}
              </h2>
              <p className="text-sm text-zinc-400">
                {latestSide
                  ? `Lado ${latestSide.side}`
                  : latestRally.effective_status.toUpperCase()}
                {latestAction?.action_type
                  ? ` · ${actionLabels[latestAction.action_type as keyof typeof actionLabels]}`
                  : " · sem ação"}
              </p>
            </div>
            <Badge>{latestRally.effective_status.toUpperCase()}</Badge>
          </div>

          {canScore &&
            (matchStatus === "in_progress" ||
              (isAdmin && matchStatus === "pending_review")) &&
            latestSide && (
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {Object.entries(actionLabels).map(([value, label]) => (
                    <Button
                      key={value}
                      variant={
                        selectedAction === value ? "primary" : "secondary"
                      }
                      onClick={() =>
                        setSelectedAction(value as keyof typeof actionLabels)
                      }
                    >
                      {label}
                    </Button>
                  ))}
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedAction(null)}
                  >
                    SEM AÇÃO
                  </Button>
                </div>
                {selectedAction && (
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <select
                      aria-label="Atleta da ação técnica"
                      value={selectedAthleteId}
                      onChange={(event) => setAthleteId(event.target.value)}
                      className="rounded-ur border bg-black p-3"
                    >
                      {eligibleAthletes.map((athlete) => (
                        <option
                          key={athlete.athleteId}
                          value={athlete.athleteId}
                        >
                          {athlete.code} · {athlete.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      disabled={pending || !selectedAthleteId}
                      onClick={() =>
                        run(() =>
                          recordTechnicalActionAction({
                            matchId,
                            rallyId: latestRally.id,
                            athleteId: selectedAthleteId,
                            actionType: selectedAction,
                            correctionReason: latestAction ? reason : null,
                            operationId: operationId(),
                          }),
                        )
                      }
                      data-testid="save-technical-action"
                    >
                      {latestAction ? "CORRIGIR AÇÃO" : "SALVAR AÇÃO"}
                    </Button>
                  </div>
                )}
                <div className="grid gap-2 border-t border-zinc-800 pt-3">
                  <label className="text-sm text-zinc-300">
                    Motivo da correção
                    <input
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      minLength={5}
                      className="rounded-ur mt-1 block w-full border bg-black p-3"
                    />
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      variant="secondary"
                      disabled={pending || reason.trim().length < 5}
                      onClick={() =>
                        run(() =>
                          correctRallyAction({
                            matchId,
                            rallyId: latestRally.id,
                            correctionType: "replace_winner",
                            replacementWinningSideId:
                              latestSide.id === sideA.id ? sideB.id : sideA.id,
                            reason,
                            operationId: operationId(),
                          }),
                        )
                      }
                      data-testid="correct-last-point"
                    >
                      CORRIGIR LADO
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={pending || reason.trim().length < 5}
                      onClick={() =>
                        run(() =>
                          correctRallyAction({
                            matchId,
                            rallyId: latestRally.id,
                            correctionType: "reverse",
                            replacementWinningSideId: null,
                            reason,
                            operationId: operationId(),
                          }),
                        )
                      }
                      data-testid="reverse-last-point"
                    >
                      DESFAZER COM REVERSÃO
                    </Button>
                  </div>
                </div>
              </div>
            )}
        </Card>
      )}

      {(scoreboard.is_game_over ||
        matchStatus === "pending_review" ||
        result) && (
        <Card className="border-ur-gold grid gap-4" data-testid="match-review">
          <div>
            <p className="text-ur-gold font-black">FIM DE JOGO</p>
            <h2 className="text-3xl font-black">
              {scoreboard.score_a} × {scoreboard.score_b}
            </h2>
            <p>
              Vencedor: Lado{" "}
              {orderedSides.find(
                (side) => side.id === scoreboard.winner_side_id,
              )?.side ?? "—"}
              {gamePointRallyNumber
                ? ` · game point no rally ${gamePointRallyNumber}`
                : ""}
            </p>
            <p className="text-sm text-zinc-400">
              {scoreboard.valid_rallies} rallies ·{" "}
              {result?.result_status ?? "provisional"}
            </p>
          </div>
          {canScore && result?.result_status === "provisional" && (
            <Button
              onClick={() =>
                run(() =>
                  submitMatchForReviewAction({
                    matchId,
                    operationId: operationId(),
                  }),
                )
              }
              disabled={pending}
              data-testid="submit-review"
            >
              REVISAR RESULTADO
            </Button>
          )}
          {canHomologate && result?.result_status === "under_review" && (
            <Button
              onClick={() =>
                run(() =>
                  homologateMatchAction({
                    matchId,
                    operationId: operationId(),
                  }),
                )
              }
              disabled={pending}
              data-testid="homologate-result"
            >
              HOMOLOGAR
            </Button>
          )}
        </Card>
      )}

      {summary.some((item) =>
        Object.values(item).some(
          (value) => typeof value === "number" && value > 0,
        ),
      ) && (
        <Card>
          <h2 className="mb-3 font-black">AÇÕES TÉCNICAS</h2>
          <div className="grid gap-2">
            {summary.map((item) => {
              const athlete = sides
                .flatMap((side) => side.participants)
                .find((entry) => entry.athleteId === item.athlete_id);
              return (
                <p key={item.athlete_id} className="text-sm">
                  <strong>{athlete?.name ?? item.athlete_id}</strong> ·{" "}
                  {item.aces} aces · {item.attacks} ataques · {item.blocks}{" "}
                  bloqueios · {item.defenses} defesas · {item.assists} assists
                </p>
              );
            })}
          </div>
        </Card>
      )}

      {(isAdmin || versions.length > 0) && (
        <Card className="grid gap-4">
          <h2 className="font-black">HISTÓRICO DO RESULTADO</h2>
          {versions.map((version) => (
            <div
              key={version.id}
              className="rounded-ur border border-zinc-800 p-3 text-sm"
            >
              <strong>
                v{version.version_number} · {version.score_a} ×{" "}
                {version.score_b} · {version.result_status}
              </strong>
              <p className="text-zinc-400">{version.reason}</p>
            </div>
          ))}
          {isAdmin && result?.result_status === "homologated" && (
            <div className="grid gap-2 border-t border-zinc-800 pt-3">
              <label>
                Motivo administrativo
                <input
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  minLength={5}
                  className="rounded-ur mt-1 block w-full border bg-black p-3"
                />
              </label>
              <Button
                variant="secondary"
                disabled={pending || reason.trim().length < 5}
                onClick={() =>
                  run(() =>
                    requestMatchCorrectionAction({
                      matchId,
                      reason,
                      operationId: operationId(),
                    }),
                  )
                }
                data-testid="request-result-correction"
              >
                SOLICITAR CORREÇÃO
              </Button>
              <Button
                variant="ghost"
                disabled={pending || reason.trim().length < 5}
                onClick={() =>
                  run(() =>
                    voidMatchAction({
                      matchId,
                      reason,
                      operationId: operationId(),
                    }),
                  )
                }
              >
                INVALIDAR RESULTADO
              </Button>
            </div>
          )}
        </Card>
      )}
    </section>
  );
}
