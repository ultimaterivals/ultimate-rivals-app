import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getAthleteStatistics } from "@/server/repositories/scoring.repository";
import { listUrPlaySessions } from "@/server/repositories/ur-play.repository";
const first = <T,>(value: T | T[] | null | undefined) =>
  Array.isArray(value) ? value[0] : value;
export default async function Page() {
  const identity = await requireRole("athlete"),
    client = await createClient(),
    rows = (await listUrPlaySessions(client)).filter((s) =>
    [
      "published",
      "registration_open",
      "registration_closed",
      "checkin_open",
    ].includes(s.status),
    ),
    { data: athlete } = await client
      .from("athletes")
      .select("id")
      .eq("profile_id", identity.userId)
      .maybeSingle(),
    { data: participations } = athlete
      ? await client
          .from("match_participants")
          .select("match_id,side_id")
          .eq("athlete_id", athlete.id)
          .eq("status", "active")
      : { data: [] },
    matchIds = (participations ?? []).map((item) => item.match_id),
    { data: results } = matchIds.length
      ? await client
          .from("match_results")
          .select("match_id,winner_side_id,score_a,score_b,result_status,matches(match_code,ended_at)")
          .in("match_id", matchIds)
          .order("updated_at", { ascending: false })
      : { data: [] },
    statistics = athlete ? await getAthleteStatistics(client, athlete.id) : null,
    sideByMatch = new Map(
      (participations ?? []).map((item) => [item.match_id, item.side_id]),
    );
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Experiência semanal"
        title="UR Play"
        description="Próximas sessões, vagas e inscrições."
      />
      {statistics && (
        <Card className="border-ur-gold/40">
          <h2 className="font-black">MINHAS ESTATÍSTICAS HOMOLOGADAS</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Jogos", statistics.games_participated],
              ["Vitórias", statistics.wins],
              ["Derrotas", statistics.losses],
              ["Aces", statistics.aces],
              ["Ataques", statistics.attacks],
              ["Bloqueios", statistics.blocks],
              ["Defesas", statistics.defenses],
              ["Assists", statistics.assists],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-zinc-500 uppercase">{label}</p>
                <strong className="text-2xl">{value}</strong>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Estatísticas esportivas brutas. Nenhum ponto de ranking é calculado.
          </p>
        </Card>
      )}
      {(results ?? []).length > 0 && (
        <section className="grid gap-3">
          <h2 className="text-xl font-black">MEUS RESULTADOS</h2>
          {(results ?? []).map((result) => {
            const match = first(result.matches),
              won = sideByMatch.get(result.match_id) === result.winner_side_id;
            return (
              <Card key={result.match_id}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <strong>{match?.match_code}</strong>
                    <p className="text-sm text-zinc-400 uppercase">
                      {result.result_status}
                    </p>
                  </div>
                  <div className="text-right">
                    <strong className="text-3xl">
                      {result.score_a} × {result.score_b}
                    </strong>
                    <p className={won ? "text-ur-gold font-black" : "text-zinc-400"}>
                      {result.result_status === "homologated"
                        ? won
                          ? "VITÓRIA"
                          : "DERROTA"
                        : "EM REVISÃO"}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </section>
      )}
      {rows.map((s) => {
        const confirmed = s.ur_play_registrations.filter(
          (r) => r.registration_status === "confirmed",
        ).length;
        return (
          <Card key={s.id}>
            <p className="text-ur-gold font-bold">
              {new Date(s.starts_at).toLocaleDateString("pt-BR", {
                weekday: "short",
                day: "2-digit",
                month: "short",
              })}
            </p>
            <h2 className="text-2xl font-black">{s.name}</h2>
            <p>
              {new Date(s.starts_at).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              —{" "}
              {new Date(s.ends_at).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p>
              {confirmed}/{s.capacity} vagas ·{" "}
              {
                s.ur_play_registrations.filter(
                  (r) => r.registration_status === "waitlisted",
                ).length
              }{" "}
              na espera
            </p>
            <Link
              href={`/athlete/ur-play/${s.id}`}
              className="mt-3 inline-block font-black"
            >
              VER SESSÃO →
            </Link>
          </Card>
        );
      })}
    </div>
  );
}
