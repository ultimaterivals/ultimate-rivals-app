import { Button, Card, PageHeader } from "@/components/ui";
import { transitionMatchAction } from "@/features/court-ops/actions";
import { createClient } from "@/lib/supabase/server";
import { getMatchPanel } from "@/server/repositories/court-ops.repository";
const next: Record<string, { status: string; label: string }> = {
  queued: { status: "called", label: "CHAMAR ATLETAS" },
  called: { status: "ready", label: "TODOS PRONTOS" },
  ready: { status: "in_progress", label: "INICIAR JOGO" },
};
type MatchParticipant = {
  id: string;
  position_order: number;
  athletes: { public_name?: string } | { public_name?: string }[] | null;
};
type MatchSide = {
  id: string;
  side: string;
  match_participants: MatchParticipant[] | null;
};
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params,
    match = await getMatchPanel(await createClient(), id),
    court = Array.isArray(match.courts) ? match.courts[0] : match.courts,
    format = Array.isArray(match.competitive_formats)
      ? match.competitive_formats[0]
      : match.competitive_formats,
    category = Array.isArray(match.competitive_categories)
      ? match.competitive_categories[0]
      : match.competitive_categories,
    nextAction = next[match.status],
    sides = (match.match_sides ?? []) as MatchSide[];
  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow={match.match_code}
        title={`JOGO ${match.scheduled_order}`}
        description={`${court?.name} · ${match.level.toUpperCase()} · ${format?.name} ${category?.name ?? ""}`}
      />
      {sides
        .sort((a, b) => a.side.localeCompare(b.side))
        .map((side) => (
          <Card key={side.id}>
            <p className="text-ur-gold font-black">LADO {side.side}</p>
            {side.match_participants
              ?.sort((a, b) => a.position_order - b.position_order)
              .map((participant) => {
                const athlete = Array.isArray(participant.athletes)
                  ? participant.athletes[0]
                  : participant.athletes;
                return (
                  <h2 key={participant.id} className="text-2xl font-black">
                    {athlete?.public_name}
                  </h2>
                );
              })}
          </Card>
        ))}
      <strong className="text-center text-2xl">
        {match.status.toUpperCase()}
      </strong>
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
      {["queued", "called", "ready"].includes(match.status) && (
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
