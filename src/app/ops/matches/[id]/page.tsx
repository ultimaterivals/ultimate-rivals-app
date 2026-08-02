import { Badge, Button, Card, PageHeader } from "@/components/ui";
import {
  addReserveAction,
  changeMatchCourtAction,
  promoteReserveAction,
  removeReserveAction,
  reservePresenceAction,
  transitionMatchAction,
} from "@/features/court-ops/actions";
import { createClient } from "@/lib/supabase/server";
import { getMatchPanel } from "@/server/repositories/court-ops.repository";

const next: Record<string, { status: string; label: string }> = {
  queued: { status: "called", label: "CHAMAR ATLETAS" },
  called: { status: "ready", label: "TODOS PRONTOS" },
  ready: { status: "in_progress", label: "INICIAR JOGO" },
};
const first = <T,>(value: T | T[] | null | undefined) =>
  Array.isArray(value) ? value[0] : value;
type Athlete = {
  athlete_code?: string;
  public_name?: string;
  gender?: string;
};
type MatchParticipant = {
  id: string;
  athlete_id: string;
  position_order: number;
  athletes: Athlete | Athlete[] | null;
};
type SquadMember = {
  id: string;
  athlete_id: string;
  squad_role: "starter" | "reserve";
  initial_squad_role: "starter" | "reserve";
  status: string;
  reserve_presence_status: string | null;
  position_order: number;
  athletes: Athlete | Athlete[] | null;
};
type MatchSide = {
  id: string;
  side: string;
  roster_id: string | null;
  teams: { name?: string } | { name?: string }[] | null;
  team_rosters: { name?: string } | { name?: string }[] | null;
  match_participants: MatchParticipant[] | null;
  match_squad_members: SquadMember[] | null;
};
type SessionCourt = {
  court_id: string;
  status: string;
  courts: { name?: string } | { name?: string }[] | null;
};
type SessionMatch = { id: string; court_id: string; status: string };
type AvailableQueueEntry = {
  athlete_id: string;
  athletes: Athlete | Athlete[] | null;
};

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params,
    { error } = await searchParams,
    match = await getMatchPanel(await createClient(), id),
    court = first(match.courts),
    format = first(match.competitive_formats),
    category = first(match.competitive_categories),
    session = first(match.ur_play_sessions),
    nextAction = next[match.status],
    sides = (match.match_sides ?? []) as MatchSide[],
    preStart = ["draft", "queued", "called", "ready"].includes(match.status),
    freeCourts = (
      (session?.ur_play_session_courts ?? []) as SessionCourt[]
    ).filter(
      (sessionCourt) =>
        sessionCourt.status === "active" &&
        sessionCourt.court_id !== match.court_id &&
        !(match.session_matches as SessionMatch[]).some(
          (sessionMatch) =>
            sessionMatch.id !== match.id &&
            sessionMatch.court_id === sessionCourt.court_id,
        ),
    );

  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow={match.match_code}
        title={`JOGO ${match.scheduled_order}`}
        description={`${court?.name} · ${match.level.toUpperCase()} · ${format?.name} ${category?.name ?? ""}`}
      />
      {error && <Card className="border-red-500 text-red-300">{error}</Card>}
      <div className="grid gap-5 xl:grid-cols-2">
        {sides
          .sort((a, b) => a.side.localeCompare(b.side))
          .map((side) => {
            const participants = (side.match_participants ?? []).sort(
                (a, b) => a.position_order - b.position_order,
              ),
              squad = side.match_squad_members ?? [],
              reserves = squad
                .filter((member) => member.squad_role === "reserve")
                .sort((a, b) => a.position_order - b.position_order),
              team = first(side.teams),
              roster = first(side.team_rosters);
            return (
              <Card key={side.id} className="grid gap-4">
                <div>
                  <p className="text-ur-gold font-black">LADO {side.side}</p>
                  <p className="text-xs text-zinc-500 uppercase">
                    {side.roster_id
                      ? `FORMAÇÃO OFICIAL · ${team?.name ?? "Equipe"} · ${roster?.name ?? "Quarteto"}`
                      : "FORMAÇÃO TEMPORÁRIA DO UR PLAY"}
                  </p>
                </div>
                <section className="grid gap-2">
                  <h2 className="font-black">ATIVOS · EM QUADRA</h2>
                  {participants.map((participant, index) => {
                    const athlete = first(participant.athletes);
                    return (
                      <div
                        key={participant.id}
                        className="rounded-ur flex items-center justify-between border border-zinc-800 p-3"
                      >
                        <div>
                          <strong>
                            {index + 1}. {athlete?.public_name}
                          </strong>
                          <p className="text-xs text-zinc-500">
                            {athlete?.athlete_code} · {athlete?.gender} ·
                            TITULAR
                          </p>
                        </div>
                        <Badge>ATIVO</Badge>
                      </div>
                    );
                  })}
                </section>
                <section className="grid gap-3">
                  <h2 className="font-black">RESERVAS · BANCO</h2>
                  {reserves.length === 0 && (
                    <p className="text-sm text-zinc-500">
                      Nenhuma reserva convocada.
                    </p>
                  )}
                  {reserves.map((reserve, index) => {
                    const athlete = first(reserve.athletes),
                      activeReserve = !["withdrawn", "unavailable"].includes(
                        reserve.status,
                      );
                    return (
                      <div
                        key={reserve.id}
                        className="rounded-ur grid gap-3 border border-zinc-800 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <strong>
                              R{index + 1}. {athlete?.public_name}
                            </strong>
                            <p className="text-xs text-zinc-500">
                              {athlete?.athlete_code} · {athlete?.gender} ·
                              RESERVA
                            </p>
                          </div>
                          <Badge>
                            {reserve.reserve_presence_status?.toUpperCase() ??
                              reserve.status.toUpperCase()}
                          </Badge>
                        </div>
                        {preStart && activeReserve && (
                          <>
                            <form
                              action={reservePresenceAction}
                              className="grid grid-cols-2 gap-2"
                            >
                              <input type="hidden" name="matchId" value={id} />
                              <input
                                type="hidden"
                                name="memberId"
                                value={reserve.id}
                              />
                              <input
                                type="hidden"
                                name="reason"
                                value="Presença operacional confirmada"
                              />
                              <select
                                name="presence"
                                defaultValue="present"
                                className="rounded-ur border bg-black p-2"
                              >
                                <option value="present">Presente</option>
                                <option value="absent">Ausente</option>
                                <option value="excused">Justificado</option>
                              </select>
                              <Button type="submit" variant="secondary">
                                CONFIRMAR PRESENÇA
                              </Button>
                            </form>
                            {reserve.reserve_presence_status === "present" &&
                              participants.length > 0 && (
                                <form
                                  action={promoteReserveAction}
                                  className="grid gap-2 border-t border-zinc-800 pt-3"
                                >
                                  <input
                                    type="hidden"
                                    name="matchId"
                                    value={id}
                                  />
                                  <input
                                    type="hidden"
                                    name="reserveMemberId"
                                    value={reserve.id}
                                  />
                                  <label>
                                    Titular que sai
                                    <select
                                      name="participantId"
                                      className="rounded-ur block w-full border bg-black p-2"
                                    >
                                      {participants.map((participant) => (
                                        <option
                                          key={participant.id}
                                          value={participant.id}
                                        >
                                          {
                                            first(participant.athletes)
                                              ?.public_name
                                          }
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <label>
                                    Destino do titular
                                    <select
                                      name="outgoingDisposition"
                                      defaultValue="bench"
                                      className="rounded-ur block w-full border bg-black p-2"
                                    >
                                      <option value="bench">
                                        Mover para banco
                                      </option>
                                      <option value="waiting">
                                        Voltar à fila
                                      </option>
                                      <option value="withdrawn">Retirar</option>
                                    </select>
                                  </label>
                                  <input
                                    name="reason"
                                    required
                                    minLength={5}
                                    defaultValue="Ajuste operacional pré-jogo"
                                    className="rounded-ur border bg-black p-2"
                                  />
                                  <Button type="submit">
                                    COLOCAR EM QUADRA
                                  </Button>
                                </form>
                              )}
                            <form
                              action={removeReserveAction}
                              className="grid grid-cols-2 gap-2"
                            >
                              <input type="hidden" name="matchId" value={id} />
                              <input
                                type="hidden"
                                name="memberId"
                                value={reserve.id}
                              />
                              <input
                                type="hidden"
                                name="disposition"
                                value="waiting"
                              />
                              <input
                                type="hidden"
                                name="reason"
                                value="Reserva retirada antes do jogo"
                              />
                              <Button
                                type="submit"
                                variant="secondary"
                                className="col-span-2"
                              >
                                RETIRAR CONVOCAÇÃO
                              </Button>
                            </form>
                          </>
                        )}
                      </div>
                    );
                  })}
                  {preStart &&
                    format?.code === "fours" &&
                    reserves.filter(
                      (reserve) =>
                        !["withdrawn", "unavailable"].includes(reserve.status),
                    ).length < 3 &&
                    match.available_queue.length > 0 && (
                      <form
                        action={addReserveAction}
                        className="grid gap-2 border-t border-zinc-800 pt-3"
                      >
                        <input type="hidden" name="matchId" value={id} />
                        <input type="hidden" name="sideId" value={side.id} />
                        <input
                          type="hidden"
                          name="rosterId"
                          value={side.roster_id ?? ""}
                        />
                        <label>
                          Adicionar reserva
                          <select
                            name="athleteId"
                            className="rounded-ur block w-full border bg-black p-2"
                          >
                            {(
                              match.available_queue as AvailableQueueEntry[]
                            ).map((entry) => (
                              <option
                                key={entry.athlete_id}
                                value={entry.athlete_id}
                              >
                                {first(entry.athletes)?.athlete_code} ·{" "}
                                {first(entry.athletes)?.public_name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <Button type="submit" variant="secondary">
                          ADICIONAR AO BANCO
                        </Button>
                      </form>
                    )}
                </section>
              </Card>
            );
          })}
      </div>
      <strong className="text-center text-2xl">
        {match.status.toUpperCase()}
      </strong>
      {preStart && freeCourts.length > 0 && (
        <Card>
          <form
            action={changeMatchCourtAction}
            className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end"
          >
            <input type="hidden" name="matchId" value={id} />
            <label>
              Alterar quadra
              <select
                name="courtId"
                className="rounded-ur block w-full border bg-black p-3"
              >
                {freeCourts.map((sessionCourt) => (
                  <option
                    key={sessionCourt.court_id}
                    value={sessionCourt.court_id}
                  >
                    {first(sessionCourt.courts)?.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Motivo
              <input
                name="reason"
                required
                minLength={5}
                defaultValue="Ajuste operacional de quadra"
                className="rounded-ur block w-full border bg-black p-3"
              />
            </label>
            <Button type="submit" variant="secondary">
              ALTERAR QUADRA
            </Button>
          </form>
        </Card>
      )}
      {nextAction && (
        <form action={transitionMatchAction}>
          <input type="hidden" name="matchId" value={id} />
          <input type="hidden" name="sessionId" value={match.session_id} />
          <input type="hidden" name="status" value={nextAction.status} />
          <Button type="submit" className="min-h-14 w-full">
            {nextAction.label}
          </Button>
        </form>
      )}
      {preStart && (
        <form action={transitionMatchAction}>
          <input type="hidden" name="matchId" value={id} />
          <input type="hidden" name="sessionId" value={match.session_id} />
          <input type="hidden" name="status" value="cancelled" />
          <input
            name="reason"
            required
            minLength={5}
            placeholder="Motivo do cancelamento"
            className="rounded-ur mb-2 w-full border bg-black p-3"
          />
          <Button type="submit" variant="secondary" className="w-full">
            CANCELAR
          </Button>
        </form>
      )}
      {match.status === "in_progress" && (
        <>
          <Card className="border-ur-gold">
            <h2 className="font-black">REGISTRO DO JOGO</h2>
            <p>Disponível na próxima etapa.</p>
            <strong>READY FOR SCORING</strong>
          </Card>
          <form action={transitionMatchAction}>
            <input type="hidden" name="matchId" value={id} />
            <input type="hidden" name="sessionId" value={match.session_id} />
            <input type="hidden" name="status" value="abandoned" />
            <input
              type="hidden"
              name="reason"
              value="Interrompida pela operação"
            />
            <Button type="submit" variant="secondary" className="w-full">
              ABANDONAR PARTIDA
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
