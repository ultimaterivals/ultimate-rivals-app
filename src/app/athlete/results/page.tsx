import { CalendarDays, Trophy } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";
import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";
import { createClient } from "@/lib/supabase/server";

type ResultRow = {
  match_id: string;
  side_id: string;
  matches: {
    match_code: string;
    ended_at: string | null;
    ur_play_sessions: { name: string } | null;
    match_results: {
      winner_side_id: string | null;
      score_a: number;
      score_b: number;
      result_status: string;
    } | null;
  } | null;
};

export default async function AthleteResultsPage() {
  const viewer = await requireAthleteViewer();
  const client = await createClient();
  const [matchesResult, statisticsResult] = await Promise.all([
    client
      .from("match_participants")
      .select(
        "match_id,side_id,matches!inner(match_code,ended_at,ur_play_sessions(name),match_results(winner_side_id,score_a,score_b,result_status))",
      )
      .eq("athlete_id", viewer.athleteId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(20),
    client
      .from("match_technical_summary")
      .select("match_id,aces,attacks,blocks,defenses,assists")
      .eq("athlete_id", viewer.athleteId),
  ]);

  const matches = (matchesResult.data ?? []) as unknown as ResultRow[];
  const stats = new Map(
    (statisticsResult.data ?? []).map((row) => [row.match_id, row]),
  );

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <PageHeader
        eyebrow="Resultados"
        title="Seus jogos oficiais"
        description="Placares e estatísticas dos seus jogos. Seu ranking é atualizado com os resultados confirmados."
      />
      {matches.length === 0 ? (
        <Card>
          <Trophy className="text-ur-gold" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-black">
            Nenhum resultado publicado
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Seus jogos aparecerão aqui depois de registrados e disponibilizados
            pela operação.
          </p>
        </Card>
      ) : (
        <section className="grid gap-4">
          {matches.map((entry) => {
            const match = entry.matches;
            const result = match?.match_results;
            const won = result?.winner_side_id === entry.side_id;
            const stat = stats.get(entry.match_id);
            return (
              <Card
                key={entry.match_id}
                className="grid gap-4 sm:grid-cols-[1fr_auto]"
              >
                <div>
                  <p className="text-xs font-black tracking-[.16em] text-zinc-500 uppercase">
                    {match?.ur_play_sessions?.name ?? "Evento UR"}
                  </p>
                  <h2 className="mt-1 text-xl font-black">
                    {match?.match_code ?? "Partida"}
                  </h2>
                  <p className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
                    <CalendarDays size={15} aria-hidden="true" />
                    {match?.ended_at
                      ? new Date(match.ended_at).toLocaleString("pt-BR")
                      : "Data ainda não publicada"}
                  </p>
                  {stat && (
                    <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold text-zinc-400">
                      <span>Aces: {stat.aces}</span>
                      <span>Ataques: {stat.attacks}</span>
                      <span>Bloqueios: {stat.blocks}</span>
                      <span>Defesas: {stat.defenses}</span>
                      <span>Assistências: {stat.assists}</span>
                    </p>
                  )}
                </div>
                <div className="rounded-ur border border-white/10 p-4 text-right">
                  <p className="font-display text-3xl font-black">
                    {result ? `${result.score_a} × ${result.score_b}` : "—"}
                  </p>
                  <p className="text-ur-gold mt-1 text-sm font-black">
                    {result?.result_status === "homologated"
                      ? won
                        ? "Vitória oficial"
                        : "Resultado oficial"
                      : "Aguardando homologação"}
                  </p>
                </div>
              </Card>
            );
          })}
        </section>
      )}
      {(matchesResult.error || statisticsResult.error) && (
        <p className="text-sm text-zinc-500">
          Uma fonte de resultados está temporariamente indisponível.
        </p>
      )}
    </div>
  );
}
