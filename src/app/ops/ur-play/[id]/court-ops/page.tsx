import Link from "next/link";
import { Button, Card, PageHeader } from "@/components/ui";
import {
  requestSuggestionAction,
  setQueueStatusAction,
  createMatchAction,
} from "@/features/court-ops/actions";
import { createClient } from "@/lib/supabase/server";
import { getCourtOpsDashboard } from "@/server/repositories/court-ops.repository";
import { suggestNextMatch } from "@/server/services/matchmaking.service";

type MatchMetricSide = {
  match_participants: { athlete_id: string }[] | null;
};

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params,
    query = await searchParams,
    client = await createClient(),
    data = await getCourtOpsDashboard(client, id),
    waiting = data.queue.filter((row) =>
      ["waiting", "resting"].includes(row.status),
    ),
    playing = data.queue.filter((row) => row.status === "playing"),
    courts = data.session.ur_play_session_courts ?? [],
    freeCourts = courts.filter(
      (court) =>
        !data.matches.some(
          (match) =>
            match.court_id === court.court_id &&
            ["queued", "called", "ready", "in_progress"].includes(match.status),
        ),
    ),
    suggestion = query.suggest
      ? await suggestNextMatch(client, {
          sessionId: id,
          format: query.format ?? "doubles",
          category: query.category ?? "mixed",
          level: query.level ?? "leveling",
        })
      : null,
    { data: formats } = await client
      .from("competitive_formats")
      .select("id,code,name"),
    { data: categories } = await client
      .from("competitive_categories")
      .select("id,code,name");
  const athleteName = (row: (typeof data.queue)[number]) => {
    const athlete = Array.isArray(row.athletes)
      ? row.athletes[0]
      : row.athletes;
    return athlete?.public_name ?? athlete?.athlete_code;
  };
  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow="UR PLAY"
        title="Court Ops"
        description={`${new Date(data.session.starts_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}–${new Date(data.session.ends_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · ${data.queue.length} presentes · ${courts.length} quadras · ${playing.length} jogando · ${waiting.length} aguardando`}
      />
      <section className="grid gap-3 md:grid-cols-2">
        {courts.map((entry) => {
          const court = Array.isArray(entry.courts)
              ? entry.courts[0]
              : entry.courts,
            match = data.matches.find(
              (m) =>
                m.court_id === entry.court_id &&
                ["queued", "called", "ready", "in_progress"].includes(m.status),
            );
          return (
            <Card key={entry.court_id}>
              <p className="text-xs font-bold text-zinc-500 uppercase">
                {court?.name}
              </p>
              <h2 className="text-2xl font-black">
                {match ? match.status.toUpperCase() : "LIVRE"}
              </h2>
              {match ? (
                <Link
                  href={`/ops/matches/${match.id}`}
                  className="text-ur-gold font-bold"
                >
                  ABRIR {match.match_code}
                </Link>
              ) : (
                <Link
                  href={`/ops/ur-play/${id}/court-ops/new?court=${entry.court_id}`}
                  className="text-ur-gold font-bold"
                >
                  MONTAR JOGO
                </Link>
              )}
            </Card>
          );
        })}
      </section>
      <Card>
        <h2 className="text-xl font-black">AGUARDANDO</h2>
        <div className="mt-3 grid gap-2">
          {waiting.map((row, index) => (
            <div
              key={row.id}
              className="flex items-center justify-between border-t py-3"
            >
              <div>
                <strong>
                  {index + 1}. {athleteName(row)}
                </strong>
                <p className="text-sm text-zinc-400">
                  espera {row.wait_minutes} min
                </p>
              </div>
              <form action={setQueueStatusAction}>
                <input type="hidden" name="sessionId" value={id} />
                <input type="hidden" name="entryId" value={row.id} />
                <input type="hidden" name="status" value="unavailable" />
                <Button type="submit" variant="secondary">
                  INDISPONÍVEL
                </Button>
              </form>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <h2 className="text-xl font-black">SUGERIR PRÓXIMO JOGO</h2>
        <form
          action={requestSuggestionAction}
          className="mt-3 grid gap-3 sm:grid-cols-4"
        >
          <input type="hidden" name="sessionId" value={id} />
          <select name="format" className="rounded-ur border bg-black p-3">
            <option value="doubles">Duplas</option>
            <option value="fours">Quartetos</option>
          </select>
          <select name="category" className="rounded-ur border bg-black p-3">
            <option value="mixed">Misto</option>
            <option value="female">Feminino</option>
            <option value="male">Masculino</option>
          </select>
          <select name="level" className="rounded-ur border bg-black p-3">
            <option value="leveling">Nivelamento</option>
            <option value="n3">N3</option>
            <option value="n2">N2</option>
            <option value="n1">N1</option>
          </select>
          <Button type="submit">GERAR SUGESTÃO</Button>
        </form>
        {suggestion && (
          <div className="mt-5 border-t pt-4">
            <p className="font-bold">
              Sugestão baseada em: {suggestion.explanation.join(", ")}
            </p>
            {suggestion.warnings.map((warning) => (
              <p key={warning} className="text-amber-400">
                {warning}
              </p>
            ))}
            {suggestion.warnings.length === 0 && (
              <form action={createMatchAction} className="mt-3 grid gap-3">
                <input type="hidden" name="sessionId" value={id} />
                <input
                  type="hidden"
                  name="formatId"
                  value={
                    formats?.find((f) => f.code === (query.format ?? "doubles"))
                      ?.id
                  }
                />
                <input
                  type="hidden"
                  name="categoryId"
                  value={
                    categories?.find(
                      (c) => c.code === (query.category ?? "mixed"),
                    )?.id
                  }
                />
                <input
                  type="hidden"
                  name="level"
                  value={query.level ?? "leveling"}
                />
                {suggestion.sideA.map((row) => (
                  <input
                    key={row.athleteId}
                    type="hidden"
                    name="sideA"
                    value={row.athleteId}
                  />
                ))}
                {suggestion.sideB.map((row) => (
                  <input
                    key={row.athleteId}
                    type="hidden"
                    name="sideB"
                    value={row.athleteId}
                  />
                ))}
                <select
                  name="courtId"
                  className="rounded-ur border bg-black p-3"
                >
                  {freeCourts.map((court) => (
                    <option key={court.court_id} value={court.court_id}>
                      {
                        (Array.isArray(court.courts)
                          ? court.courts[0]
                          : court.courts
                        )?.name
                      }
                    </option>
                  ))}
                </select>
                <Button type="submit">CONFIRMAR SUGESTÃO</Button>
              </form>
            )}
          </div>
        )}
      </Card>
      <Card>
        <h2 className="text-xl font-black">JOGOS POR ATLETA</h2>
        {data.queue.map((row) => (
          <p key={row.id}>
            {athleteName(row)} ·{" "}
            {
              data.matches.filter((match) =>
                ((match.match_sides ?? []) as MatchMetricSide[]).some((side) =>
                  side.match_participants?.some(
                    (participant) => participant.athlete_id === row.athlete_id,
                  ),
                ),
              ).length
            }
          </p>
        ))}
      </Card>
    </div>
  );
}
