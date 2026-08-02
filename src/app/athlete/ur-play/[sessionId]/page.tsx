import { Button, Card, PageHeader } from "@/components/ui";
import {
  cancelUrPlayRegistrationAction,
  registerUrPlayAction,
} from "@/features/ur-play/actions";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getUrPlaySession } from "@/server/repositories/ur-play.repository";
export default async function Page({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params,
    a = await requireRole("athlete"),
    c = await createClient(),
    { data: athlete } = await c
      .from("athletes")
      .select("id")
      .eq("profile_id", a.userId)
      .single(),
    d = await getUrPlaySession(c, sessionId),
    mine = d.registrations.find((r) => r.athlete_id === athlete?.id),
    { data: queueEntry } = athlete
      ? await c
          .from("match_queue_entries")
          .select(
            "status,queued_at,current_match_id,matches(match_code,status,courts(name),match_sides(side,match_participants(athlete_id,athletes(public_name)),match_squad_members(athlete_id,initial_squad_role,squad_role,status,reserve_presence_status)))",
          )
          .eq("session_id", sessionId)
          .eq("athlete_id", athlete.id)
          .maybeSingle()
      : { data: null };
  const currentMatch = first(queueEntry?.matches),
    mySquad = currentMatch?.match_sides
      ?.flatMap((side) => side.match_squad_members ?? [])
      .find((member) => member.athlete_id === athlete?.id),
    isEffectiveParticipant = currentMatch?.match_sides?.some((side) =>
      side.match_participants?.some(
        (participant: { athlete_id: string }) =>
          participant.athlete_id === athlete?.id,
      ),
    );
  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="UR Play" title={d.session.name} />
      <Card>
        <p>{new Date(d.session.starts_at).toLocaleString("pt-BR")}</p>
        <p>
          {
            d.registrations.filter((r) => r.registration_status === "confirmed")
              .length
          }
          /{d.session.capacity} confirmados
        </p>
        {mine ? (
          <>
            <strong className="text-ur-gold mt-3 block text-xl">
              {mine.registration_status === "confirmed"
                ? "✓ INSCRIÇÃO CONFIRMADA"
                : mine.registration_status === "waitlisted"
                  ? `LISTA DE ESPERA — POSIÇÃO ${mine.waitlist_position}`
                  : mine.registration_status}
            </strong>
            {["confirmed", "waitlisted"].includes(mine.registration_status) && (
              <form action={cancelUrPlayRegistrationAction} className="mt-3">
                <input name="registrationId" type="hidden" value={mine.id} />
                <input
                  name="reason"
                  type="hidden"
                  value="Cancelamento solicitado pelo atleta"
                />
                <Button variant="secondary">Cancelar inscrição</Button>
              </form>
            )}
          </>
        ) : d.session.status === "registration_open" && athlete ? (
          <form action={registerUrPlayAction} className="mt-3">
            <input name="sessionId" type="hidden" value={sessionId} />
            <input name="athleteId" type="hidden" value={athlete.id} />
            <input name="source" type="hidden" value="athlete" />
            <Button>INSCREVER-SE</Button>
          </form>
        ) : (
          <strong>INSCRIÇÕES ENCERRADAS</strong>
        )}
      </Card>
      {queueEntry && (
        <Card className="border-ur-gold">
          <p className="text-xs font-bold text-zinc-500 uppercase">Court Ops</p>
          <h2 className="text-2xl font-black">
            {queueEntry.status === "playing"
              ? "VOCÊ ESTÁ EM QUADRA"
              : mySquad?.squad_role === "reserve"
                ? "VOCÊ FOI CONVOCADO"
                : mySquad?.squad_role === "starter" || isEffectiveParticipant
                  ? "VOCÊ ESTÁ ESCALADO"
              : queueEntry.current_match_id
                ? "PRÓXIMO JOGO"
                : "VOCÊ ESTÁ NA FILA"}
          </h2>
          {mySquad && (
            <p className="text-ur-gold font-black">
              {mySquad.squad_role === "reserve" ? "RESERVA" : "TITULAR"}
              {mySquad.squad_role === "reserve" &&
                ` · ${(mySquad.reserve_presence_status ?? mySquad.status).toUpperCase()}`}
            </p>
          )}
          {!queueEntry.current_match_id && <p>Aguardando próximo jogo</p>}
          {queueEntry.matches && (
            <p>
              {
                (Array.isArray(queueEntry.matches)
                  ? queueEntry.matches[0]
                  : queueEntry.matches
                )?.match_code
              }
              {" · "}
              {
                (Array.isArray(queueEntry.matches)
                  ? queueEntry.matches[0]
                  : queueEntry.matches
                )?.courts
                  ? Array.isArray(
                      (Array.isArray(queueEntry.matches)
                        ? queueEntry.matches[0]
                        : queueEntry.matches)?.courts,
                    )
                    ? (Array.isArray(queueEntry.matches)
                        ? queueEntry.matches[0]
                        : queueEntry.matches)?.courts?.[0]?.name
                    : undefined
                  : undefined
              }
            </p>
          )}
        </Card>
      )}
    </div>
  );
}

function first<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
