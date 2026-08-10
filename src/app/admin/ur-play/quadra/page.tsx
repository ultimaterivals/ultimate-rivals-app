import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ListOrdered,
  Play,
  ShieldCheck,
} from "lucide-react";
import { createMatchAction } from "@/app/admin/ur-play/quadra/actions";
import { Badge, Card, PageHeader } from "@/components/ui";
import { requireAdminModule } from "@/lib/auth/admin-module-access";
import { getAdminCourtOpsSnapshot } from "@/server/services/admin-court-ops-service";

type SearchParams = Promise<{
  success?: string | string[];
  error?: string | string[];
}>;

const single = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const successMessages: Record<string, string> = {
  match_created: "Partida criada e colocada na fila da quadra.",
};
const errorMessages: Record<string, string> = {
  incomplete_side: "A formação está incompleta para o formato selecionado.",
  duplicate_athlete: "O mesmo atleta não pode ocupar dois lugares na partida.",
  ineligible_athlete: "Há atleta indisponível, sem check-in ou fora da fila elegível.",
  category_gender:
    "A composição não atende à categoria. Confirme o gênero do atleta antes de formar a partida.",
  mixed_composition:
    "A composição mista não atende à regra esportiva registrada no motor.",
  session_not_ready: "A sessão ainda não está pronta para matchmaking.",
  invalid_court: "A quadra não pertence à sessão operacional.",
  operation_denied: "Seu perfil não tem permissão para executar esta operação.",
  operation_failed: "A operação não pôde ser concluída.",
};

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function CourtOpsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const identity = await requireAdminModule("urPlay");
  const snapshot = await getAdminCourtOpsSnapshot();
  const params = await searchParams;
  const success = single(params.success);
  const error = single(params.error);
  const canOperate = ["admin", "operator"].includes(identity.role);
  const activeSessions = snapshot.sessions.filter(
    (session) =>
      session.status === "in_progress" ||
      session.matches.some((match) =>
        ["queued", "called", "ready", "in_progress", "pending_review"].includes(
          match.status,
        ),
      ),
  );

  const metrics = [
    ["Sessões em andamento", snapshot.metrics.sessionsInProgress, Activity],
    ["Na fila", snapshot.metrics.waiting, ListOrdered],
    ["Chamadas / prontas", snapshot.metrics.called, Clock3],
    ["Em jogo", snapshot.metrics.playing, Play],
    ["Em revisão", snapshot.metrics.pendingReview, ShieldCheck],
    ["Concluídas", snapshot.metrics.completed, CheckCircle2],
  ] as const;

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="UR Play"
        title="Operação de quadra"
        description="Controle a fila, forme confrontos, acompanhe partidas e leve cada resultado até a homologação. O placar oficial nasce dos rallies registrados — nunca de edição manual do resultado final."
        action={<Badge>Motor oficial</Badge>}
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {metrics.map(([label, value, Icon]) => (
          <Card key={label}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-zinc-500 uppercase">{label}</p>
              <Icon className="text-ur-gold" size={16} aria-hidden="true" />
            </div>
            <p className="font-display mt-3 text-2xl font-black">{value}</p>
          </Card>
        ))}
      </div>

      {!snapshot.infrastructureReady && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <div className="flex gap-3">
            <AlertTriangle
              className="mt-0.5 shrink-0 text-amber-300"
              size={20}
              aria-hidden="true"
            />
            <div>
              <p className="font-bold text-amber-100">Infraestrutura ainda não operacional</p>
              <p className="mt-1 text-sm leading-6 text-zinc-400">
                Nenhuma partida real deve ser criada enquanto não existir local e quadra
                homologados. O polo pode existir e coletar demanda sem inventar
                infraestrutura física.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/admin/agenda/polos"
                  className="rounded-ur border border-amber-500/30 px-3 py-2 text-xs font-bold text-amber-200 uppercase"
                >
                  Ver polos e infraestrutura
                </Link>
                <Link
                  href="/admin/agenda/configuracao"
                  className="rounded-ur border px-3 py-2 text-xs font-bold text-zinc-300 uppercase"
                >
                  Cadastrar local / quadra
                </Link>
              </div>
            </div>
          </div>
        </Card>
      )}

      {activeSessions.length === 0 ? (
        <Card>
          <p className="font-bold">Nenhuma sessão aberta para operação de quadra.</p>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            O fluxo correto é: demanda → sessão confirmada → check-in → sessão em
            andamento → fila de matchmaking → partida. Hoje o sistema não possui uma
            sessão real nesse estágio.
          </p>
          <Link
            href="/admin/agenda"
            className="text-ur-gold mt-4 inline-flex text-sm font-bold"
          >
            Abrir Agenda →
          </Link>
        </Card>
      ) : (
        activeSessions.map((session) => {
          const queue = session.queue.filter(
            (entry) =>
              ["waiting", "resting"].includes(entry.status) && !entry.currentMatchId,
          );
          return (
            <section key={session.id} className="grid gap-4">
              <Card className="border-ur-gold/20">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-2xl font-black uppercase">
                      {session.name}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {session.poleName} · {session.venueName} · {dateTime.format(new Date(session.startsAt))}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{session.status}</Badge>
                    <Badge>{session.courts.length} quadra(s)</Badge>
                    <Badge>{queue.length} elegível(is)</Badge>
                    {session.readyForMatchmaking && <Badge>matchmaking pronto</Badge>}
                  </div>
                </div>
              </Card>

              {canOperate &&
                session.status === "in_progress" &&
                session.readyForMatchmaking &&
                session.courts.length > 0 &&
                queue.length > 0 && (
                  <Card>
                    <p className="font-display text-lg font-black uppercase">
                      Formar próximo confronto
                    </p>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">
                      Duplas exigem 2 atletas por lado; quartetos, 4. A categoria é
                      validada pelo gênero confirmado no cadastro. `undisclosed` nunca é
                      inferido pelo sistema.
                    </p>
                    <form action={createMatchAction} className="mt-5 grid gap-5">
                      <input type="hidden" name="sessionId" value={session.id} />
                      <div className="grid gap-3 md:grid-cols-4">
                        <label className="grid gap-1 text-xs font-bold text-zinc-500 uppercase">
                          Quadra
                          <select
                            name="courtId"
                            required
                            className="rounded-ur border bg-black/30 px-3 py-2 text-sm text-white"
                          >
                            {session.courts.map((court) => (
                              <option key={court.id} value={court.id}>
                                {court.position}. {court.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="grid gap-1 text-xs font-bold text-zinc-500 uppercase">
                          Formato
                          <select
                            name="formatId"
                            required
                            className="rounded-ur border bg-black/30 px-3 py-2 text-sm text-white"
                          >
                            {snapshot.formats.map((format) => (
                              <option key={format.id} value={format.id}>
                                {format.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="grid gap-1 text-xs font-bold text-zinc-500 uppercase">
                          Categoria
                          <select
                            name="categoryId"
                            required
                            className="rounded-ur border bg-black/30 px-3 py-2 text-sm text-white"
                          >
                            {snapshot.categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="grid gap-1 text-xs font-bold text-zinc-500 uppercase">
                          Nível
                          <select
                            name="level"
                            required
                            defaultValue="leveling"
                            className="rounded-ur border bg-black/30 px-3 py-2 text-sm text-white"
                          >
                            <option value="leveling">Em nivelamento</option>
                            <option value="n3">N3</option>
                            <option value="n2">N2</option>
                            <option value="n1">N1</option>
                          </select>
                        </label>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        {(["sideA", "sideB"] as const).map((sideName, index) => (
                          <div key={sideName} className="rounded-ur border p-4">
                            <p className="font-display font-black uppercase">
                              Lado {index === 0 ? "A" : "B"}
                            </p>
                            <div className="mt-3 grid gap-2">
                              {queue.map((entry) => (
                                <label
                                  key={`${sideName}-${entry.id}`}
                                  className="rounded-ur flex items-center gap-3 border px-3 py-2 text-sm"
                                >
                                  <input
                                    type="checkbox"
                                    name={sideName}
                                    value={entry.athleteId}
                                  />
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate font-bold text-white">
                                      {entry.publicName}
                                    </span>
                                    <span className="text-xs text-zinc-600">
                                      {entry.athleteCode} · {entry.status}
                                    </span>
                                  </span>
                                  <span
                                    className={`text-[10px] font-bold uppercase ${
                                      entry.gender === "male" || entry.gender === "female"
                                        ? "text-emerald-300"
                                        : "text-amber-300"
                                    }`}
                                  >
                                    {entry.gender === "male"
                                      ? "masc. confirmado"
                                      : entry.gender === "female"
                                        ? "fem. confirmado"
                                        : "gênero pendente"}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <button
                        type="submit"
                        className="bg-ur-gold rounded-ur px-4 py-3 text-sm font-black text-black uppercase"
                      >
                        Criar partida na fila
                      </button>
                    </form>
                  </Card>
                )}

              <div className="grid gap-3 xl:grid-cols-2">
                {session.matches.length === 0 ? (
                  <Card>
                    <p className="text-sm text-zinc-500">Nenhuma partida formada.</p>
                  </Card>
                ) : (
                  session.matches.map((match) => (
                    <Link key={match.id} href={`/admin/ur-play/quadra/${match.id}`}>
                      <Card className="h-full transition hover:border-ur-gold/50">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-display text-xl font-black uppercase">
                              {match.code}
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">
                              {match.courtName} · {match.formatName} · {match.categoryName ?? "Sem categoria"} · {match.level.toUpperCase()}
                            </p>
                          </div>
                          <Badge>{match.status}</Badge>
                        </div>
                        <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                          <p className="truncate text-right font-bold">
                            {match.sides.find((side) => side.code === "A")?.participants
                              .map((athlete) => athlete.publicName)
                              .join(" / ") || "Lado A"}
                          </p>
                          <p className="font-display text-2xl font-black text-ur-gold">
                            {match.scoreboard
                              ? `${match.scoreboard.scoreA} × ${match.scoreboard.scoreB}`
                              : "×"}
                          </p>
                          <p className="truncate font-bold">
                            {match.sides.find((side) => side.code === "B")?.participants
                              .map((athlete) => athlete.publicName)
                              .join(" / ") || "Lado B"}
                          </p>
                        </div>
                      </Card>
                    </Link>
                  ))
                )}
              </div>
            </section>
          );
        })
      )}

      {snapshot.sourceErrors.length > 0 && (
        <Card className="border-red-500/30">
          <p className="font-bold">Leitura parcial da operação</p>
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
