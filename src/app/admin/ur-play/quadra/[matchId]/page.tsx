import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, RotateCcw, ShieldCheck } from "lucide-react";
import {
  homologateMatchAction,
  recordRallyAction,
  recordTechnicalActionAction,
  reverseLastRallyAction,
  submitMatchReviewAction,
  transitionMatchAction,
} from "@/app/admin/ur-play/quadra/actions";
import { Badge, Card, PageHeader } from "@/components/ui";
import { requireAdminModule } from "@/lib/auth/admin-module-access";
import { getAdminCourtOpsMatch } from "@/server/services/admin-court-ops-service";

type Params = Promise<{ matchId: string }>;
type SearchParams = Promise<{
  success?: string | string[];
  error?: string | string[];
}>;

const single = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const successMessages: Record<string, string> = {
  match_called: "Partida chamada. Confirme os atletas antes de liberar a quadra.",
  match_ready: "Formações confirmadas. A partida está pronta para iniciar.",
  match_in_progress: "Partida iniciada. O placar agora nasce dos rallies.",
  rally_recorded: "Rally registrado.",
  technical_recorded: "Ação técnica vinculada ao rally.",
  rally_reversed: "Correção registrada sem apagar o rally original.",
  submitted_review: "Resultado enviado para revisão oficial.",
  homologated: "Resultado homologado. Ranking e estatísticas foram processados.",
  match_cancelled: "Partida cancelada e fila liberada.",
  match_abandoned: "Partida encerrada como abandonada.",
};
const errorMessages: Record<string, string> = {
  invalid_transition: "A transição solicitada não é válida para o estado atual.",
  stale_rally: "O placar mudou antes deste comando. A página foi atualizada; tente novamente.",
  game_over: "A partida já atingiu o placar de encerramento.",
  review_required: "O resultado precisa estar formalmente em revisão antes da homologação.",
  result_inconsistent:
    "O resultado não confere com o histórico de rallies. Corrija os fatos antes de homologar.",
  operation_denied: "Seu perfil não tem permissão para executar esta ação.",
  operation_failed: "A operação não pôde ser concluída.",
};

const actionLabels: Record<string, string> = {
  ace: "Ace",
  attack: "Ataque",
  block: "Bloqueio",
  defense: "Defesa",
  assist: "Levantamento / assistência",
};

export default async function MatchConsolePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const identity = await requireAdminModule("urPlay");
  const { matchId } = await params;
  const query = await searchParams;
  const { session, match, snapshot } = await getAdminCourtOpsMatch(matchId);
  if (!session || !match) notFound();

  const success = single(query.success);
  const error = single(query.error);
  const canOperate = ["admin", "operator"].includes(identity.role);
  const canHomologate = identity.role === "admin";
  const sideA = match.sides.find((side) => side.code === "A");
  const sideB = match.sides.find((side) => side.code === "B");
  const latestRally = match.rallies.at(-1) ?? null;
  const latestWinningSide = latestRally
    ? match.sides.find((side) => side.id === latestRally.winningSideId)
    : null;
  const scoreboard = match.scoreboard;

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Operação de quadra"
        title={match.code}
        description={`${session.name} · ${match.courtName} · ${match.formatName} · ${match.categoryName ?? "Sem categoria"} · ${match.level.toUpperCase()}`}
        action={
          <Link
            href="/admin/ur-play/quadra"
            className="rounded-ur flex items-center gap-2 border px-3 py-2 text-xs font-bold text-zinc-300 uppercase"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Operação
          </Link>
        }
      />

      {success && successMessages[success] && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <p className="text-sm text-emerald-200">{successMessages[success]}</p>
        </Card>
      )}
      {error && (
        <Card className="border-red-500/30 bg-red-500/5">
          <p className="text-sm text-red-200">
            {errorMessages[error] ?? errorMessages.operation_failed}
          </p>
        </Card>
      )}

      <Card className="border-ur-gold/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge>{match.status}</Badge>
            <Badge>{scoreboard?.pointsToWin ?? 11} pontos</Badge>
            <Badge>vence por {scoreboard?.winBy ?? 1}</Badge>
            {match.result && <Badge>resultado {match.result.status}</Badge>}
          </div>
          {match.rankingRun && (
            <span className="text-xs font-bold text-emerald-300 uppercase">
              Ranking {match.rankingRun.status} · {match.rankingRun.transactionCount} transação(ões)
            </span>
          )}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
        {[sideA, sideB].map((side) => (
          <Card key={side?.id ?? "missing"} className="min-h-48">
            <p className="text-xs font-bold text-zinc-500 uppercase">
              {side?.label ?? "Lado"}
            </p>
            <p className="font-display mt-3 text-6xl font-black text-ur-gold">
              {side?.code === "A" ? (scoreboard?.scoreA ?? 0) : (scoreboard?.scoreB ?? 0)}
            </p>
            <div className="mt-4 grid gap-2">
              {side?.participants.map((athlete) => (
                <div key={athlete.id} className="rounded-ur border px-3 py-2">
                  <p className="font-bold text-white">{athlete.publicName}</p>
                  <p className="text-xs text-zinc-600">{athlete.athleteCode}</p>
                </div>
              ))}
            </div>
          </Card>
        ))}
        <div className="hidden items-center justify-center lg:flex">
          <span className="font-display text-3xl font-black text-zinc-700">×</span>
        </div>
      </div>

      {canOperate && match.status === "queued" && (
        <Card>
          <form action={transitionMatchAction}>
            <input type="hidden" name="matchId" value={match.id} />
            <input type="hidden" name="status" value="called" />
            <button
              type="submit"
              className="bg-ur-gold rounded-ur w-full px-4 py-4 font-black text-black uppercase"
            >
              Chamar atletas para a quadra
            </button>
          </form>
        </Card>
      )}

      {canOperate && match.status === "called" && (
        <Card>
          <p className="mb-4 text-sm text-zinc-500">
            Confirme visualmente que todos os titulares estão presentes e na quadra.
          </p>
          <form action={transitionMatchAction}>
            <input type="hidden" name="matchId" value={match.id} />
            <input type="hidden" name="status" value="ready" />
            <button
              type="submit"
              className="bg-ur-gold rounded-ur w-full px-4 py-4 font-black text-black uppercase"
            >
              Formações confirmadas — partida pronta
            </button>
          </form>
        </Card>
      )}

      {canOperate && match.status === "ready" && (
        <Card>
          <p className="mb-4 text-sm text-zinc-500">
            Ao iniciar, os atletas passam para `playing` e o placar oficial é aberto.
          </p>
          <form action={transitionMatchAction}>
            <input type="hidden" name="matchId" value={match.id} />
            <input type="hidden" name="status" value="in_progress" />
            <button
              type="submit"
              className="bg-ur-gold rounded-ur w-full px-4 py-4 font-black text-black uppercase"
            >
              Iniciar partida
            </button>
          </form>
        </Card>
      )}

      {canOperate && match.status === "in_progress" && scoreboard && (
        <Card className="border-ur-gold/30">
          <p className="font-display text-lg font-black uppercase">Registrar rally</p>
          <p className="mt-1 text-sm text-zinc-500">
            Rally #{scoreboard.nextRallyNumber}. Toque somente no lado que venceu o ponto.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[sideA, sideB].map((side) => (
              <form key={side?.id ?? "missing"} action={recordRallyAction}>
                <input type="hidden" name="matchId" value={match.id} />
                <input type="hidden" name="winningSideId" value={side?.id ?? ""} />
                <input
                  type="hidden"
                  name="nextRally"
                  value={scoreboard.nextRallyNumber}
                />
                <button
                  type="submit"
                  disabled={!side}
                  className="rounded-ur border-ur-gold/30 hover:bg-ur-gold/10 w-full border px-4 py-6 text-left disabled:opacity-40"
                >
                  <span className="text-xs font-bold text-zinc-500 uppercase">
                    Ponto para {side?.label}
                  </span>
                  <span className="font-display mt-2 block text-2xl font-black text-white">
                    {side?.participants.map((athlete) => athlete.publicName).join(" / ")}
                  </span>
                </button>
              </form>
            ))}
          </div>
        </Card>
      )}

      {canOperate &&
        latestRally &&
        latestWinningSide &&
        ["in_progress", "pending_review"].includes(match.status) && (
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <p className="font-display text-lg font-black uppercase">
                Ação técnica do último rally
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Opcional. O placar não depende desse registro. Para pontuação técnica,
                escolha quem concluiu a ação no lado vencedor.
              </p>
              <form action={recordTechnicalActionAction} className="mt-4 grid gap-3">
                <input type="hidden" name="matchId" value={match.id} />
                <input type="hidden" name="rallyId" value={latestRally.id} />
                <select
                  name="athleteId"
                  required
                  className="rounded-ur border bg-black/30 px-3 py-3 text-sm text-white"
                >
                  <option value="">Selecione o atleta</option>
                  {latestWinningSide.participants.map((athlete) => (
                    <option key={athlete.id} value={athlete.id}>
                      {athlete.publicName}
                    </option>
                  ))}
                </select>
                <select
                  name="actionType"
                  required
                  className="rounded-ur border bg-black/30 px-3 py-3 text-sm text-white"
                >
                  <option value="">Selecione a ação</option>
                  {Object.entries(actionLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-ur border border-ur-gold/30 px-4 py-3 text-sm font-black text-ur-gold uppercase"
                >
                  Registrar ação técnica
                </button>
              </form>
            </Card>

            <Card>
              <p className="font-display flex items-center gap-2 text-lg font-black uppercase">
                <RotateCcw size={17} aria-hidden="true" />
                Corrigir último rally
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                A correção não apaga o rally original. Ela cria um registro auditável que
                altera a projeção efetiva do placar.
              </p>
              <form action={reverseLastRallyAction} className="mt-4 grid gap-3">
                <input type="hidden" name="matchId" value={match.id} />
                <input type="hidden" name="rallyId" value={latestRally.id} />
                <input
                  name="reason"
                  required
                  minLength={5}
                  maxLength={500}
                  placeholder="Motivo da correção"
                  className="rounded-ur border bg-black/30 px-3 py-3 text-sm text-white"
                />
                <button
                  type="submit"
                  className="rounded-ur border border-amber-500/30 px-4 py-3 text-sm font-black text-amber-200 uppercase"
                >
                  Reverter último rally
                </button>
              </form>
            </Card>
          </div>
        )}

      {canOperate &&
        match.status === "pending_review" &&
        match.result?.status === "provisional" && (
          <Card className="border-sky-500/30 bg-sky-500/5">
            <p className="font-display text-lg font-black uppercase">Fechamento técnico</p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              O jogo terminou pelo histórico de rallies em {match.result.scoreA} × {match.result.scoreB}.
              Revise placar e ações antes de enviar o resultado ao gate oficial.
            </p>
            <form action={submitMatchReviewAction} className="mt-4">
              <input type="hidden" name="matchId" value={match.id} />
              <button
                type="submit"
                className="rounded-ur w-full border border-sky-500/30 px-4 py-3 text-sm font-black text-sky-200 uppercase"
              >
                Enviar resultado para revisão
              </button>
            </form>
          </Card>
        )}

      {match.status === "pending_review" && match.result?.status === "under_review" && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <p className="font-display flex items-center gap-2 text-lg font-black uppercase">
            <ShieldCheck size={18} aria-hidden="true" />
            Gate de homologação
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            O resultado em revisão só vira oficial quando conferir exatamente com o
            placar derivado dos rallies. A homologação também dispara o processamento
            de ranking.
          </p>
          {canHomologate ? (
            <form action={homologateMatchAction} className="mt-4">
              <input type="hidden" name="matchId" value={match.id} />
              <button
                type="submit"
                className="bg-ur-gold rounded-ur w-full px-4 py-3 text-sm font-black text-black uppercase"
              >
                Homologar resultado oficial
              </button>
            </form>
          ) : (
            <p className="mt-4 text-xs font-bold text-amber-200 uppercase">
              Aguardando administrador homologar.
            </p>
          )}
        </Card>
      )}

      {match.status === "completed" && match.result?.status === "homologated" && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <p className="font-display flex items-center gap-2 text-xl font-black uppercase">
            <CheckCircle2 className="text-emerald-300" size={20} aria-hidden="true" />
            Partida oficial
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            Resultado homologado: {match.result.scoreA} × {match.result.scoreB}.
            {match.rankingRun
              ? ` Processamento de ranking: ${match.rankingRun.status}, ${match.rankingRun.transactionCount} transação(ões).`
              : " O processamento de ranking ainda não apareceu nesta leitura."}
          </p>
        </Card>
      )}

      {match.technicalSummary.length > 0 && (
        <Card>
          <p className="font-display text-lg font-black uppercase">Estatísticas técnicas</p>
          <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {match.technicalSummary.map((stat) => (
              <div key={stat.athleteId} className="rounded-ur border p-3">
                <p className="font-bold text-white">{stat.publicName}</p>
                <p className="mt-2 text-xs text-zinc-500">
                  {stat.aces} ace · {stat.attacks} ataque · {stat.blocks} bloqueio · {stat.defenses} defesa · {stat.assists} assistência
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {canOperate && ["queued", "called", "ready"].includes(match.status) && (
        <Card>
          <details>
            <summary className="cursor-pointer text-xs font-bold text-zinc-500 uppercase">
              Cancelar partida
            </summary>
            <form action={transitionMatchAction} className="mt-4 grid gap-3">
              <input type="hidden" name="matchId" value={match.id} />
              <input type="hidden" name="status" value="cancelled" />
              <input
                name="reason"
                required
                maxLength={500}
                placeholder="Motivo"
                className="rounded-ur border bg-black/30 px-3 py-3 text-sm text-white"
              />
              <button
                type="submit"
                className="rounded-ur border border-red-500/30 px-4 py-3 text-sm font-black text-red-300 uppercase"
              >
                Confirmar cancelamento
              </button>
            </form>
          </details>
        </Card>
      )}

      {canOperate && match.status === "in_progress" && (
        <Card>
          <details>
            <summary className="cursor-pointer text-xs font-bold text-zinc-500 uppercase">
              Abandonar partida por ocorrência
            </summary>
            <form action={transitionMatchAction} className="mt-4 grid gap-3">
              <input type="hidden" name="matchId" value={match.id} />
              <input type="hidden" name="status" value="abandoned" />
              <input
                name="reason"
                required
                maxLength={500}
                placeholder="Descreva a ocorrência"
                className="rounded-ur border bg-black/30 px-3 py-3 text-sm text-white"
              />
              <button
                type="submit"
                className="rounded-ur border border-red-500/30 px-4 py-3 text-sm font-black text-red-300 uppercase"
              >
                Encerrar como abandonada
              </button>
            </form>
          </details>
        </Card>
      )}

      {snapshot.sourceErrors.length > 0 && (
        <Card className="border-red-500/30">
          <p className="font-bold">Leitura parcial</p>
          <ul className="mt-2 text-sm text-zinc-500">
            {snapshot.sourceErrors.map((sourceError) => (
              <li key={sourceError}>{sourceError}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
