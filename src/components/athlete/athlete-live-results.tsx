import { CalendarDays, ShieldCheck, Trophy, Users } from "lucide-react";
import { Card } from "@/components/ui";
import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";
import { createClient } from "@/lib/supabase/server";

type MatchResult = {
  winner_side_id: string | null;
  score_a: number;
  score_b: number;
  result_status: string;
};

type ResultRow = {
  match_id: string;
  side_id: string;
  matches: {
    match_code: string;
    ended_at: string | null;
    ur_play_sessions: { name: string } | null;
    match_results: MatchResult | null;
    match_participants: {
      athlete_id: string;
      side_id: string;
      athletes: { public_name: string } | null;
    }[];
  } | null;
};

function resultLabel(result: MatchResult | null | undefined, sideId: string) {
  if (!result || result.result_status !== "homologated") {
    return "Aguardando homologação";
  }
  if (!result.winner_side_id) return "Resultado homologado";
  return result.winner_side_id === sideId ? "Vitória" : "Derrota";
}

export async function AthleteLiveResults() {
  const viewer = await requireAthleteViewer();
  const client = await createClient();
  const [matchesResult, statisticsResult, impactsResult] = await Promise.all([
    client
      .from("match_participants")
      .select(
        "match_id,side_id,matches!inner(match_code,ended_at,ur_play_sessions(name),match_results(winner_side_id,score_a,score_b,result_status),match_participants(athlete_id,side_id,athletes(public_name)))",
      )
      .eq("athlete_id", viewer.athleteId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(20),
    client
      .from("match_technical_summary")
      .select("match_id,aces,attacks,blocks,defenses,assists")
      .eq("athlete_id", viewer.athleteId),
    client
      .from("ranking_transactions")
      .select("match_id,points_applied")
      .eq("athlete_id", viewer.athleteId)
      .eq("status", "homologated")
      .not("match_id", "is", null),
  ]);

  const matches = (matchesResult.data ?? []) as unknown as ResultRow[];
  const stats = new Map(
    (statisticsResult.data ?? []).map((row) => [row.match_id, row]),
  );
  const impacts = new Map<string, number>();
  for (const impact of impactsResult.data ?? []) {
    if (impact.match_id) {
      impacts.set(
        impact.match_id,
        (impacts.get(impact.match_id) ?? 0) + impact.points_applied,
      );
    }
  }
  const sourceUnavailable = Boolean(
    matchesResult.error || statisticsResult.error || impactsResult.error,
  );

  return (
    <section aria-labelledby="current-results-title" className="grid gap-4">
      <div>
        <p className="text-ur-gold text-xs font-black tracking-[.18em] uppercase">
          Operação atual
        </p>
        <h2
          id="current-results-title"
          className="font-display mt-1 text-2xl font-black sm:text-3xl"
        >
          Jogos atuais
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
          Partidas registradas pelo aplicativo, com placar, formação,
          estatísticas disponíveis e homologação publicada pela operação.
        </p>
      </div>

      {matches.length === 0 && !matchesResult.error ? (
        <Card>
          <Trophy className="text-ur-gold" aria-hidden="true" />
          <h3 className="mt-3 text-xl font-black">
            Nenhum resultado atual publicado
          </h3>
          <p className="mt-2 text-sm text-zinc-400">
            Quando um jogo registrado pelo aplicativo for disponibilizado pela
            operação, ele aparecerá aqui. Seu histórico oficial continua
            separado abaixo.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {matches.map((entry) => {
            const match = entry.matches;
            const result = match?.match_results;
            const stat = stats.get(entry.match_id);
            const participants = match?.match_participants ?? [];
            const partners = participants
              .filter(
                (participant) =>
                  participant.side_id === entry.side_id &&
                  participant.athlete_id !== viewer.athleteId,
              )
              .map((participant) => participant.athletes?.public_name)
              .filter(Boolean);
            const opponents = participants
              .filter((participant) => participant.side_id !== entry.side_id)
              .map((participant) => participant.athletes?.public_name)
              .filter(Boolean);
            const points = impacts.get(entry.match_id);
            const status = resultLabel(result, entry.side_id);

            return (
              <Card
                key={entry.match_id}
                className="grid gap-4 sm:grid-cols-[1fr_auto]"
              >
                <div>
                  <p className="text-xs font-black tracking-[.16em] text-zinc-500 uppercase">
                    {match?.ur_play_sessions?.name ?? "Jogo oficial"}
                  </p>
                  <h3 className="mt-1 text-xl font-black">
                    {match?.match_code ?? "Partida oficial"}
                  </h3>
                  <p className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
                    <CalendarDays size={15} aria-hidden="true" />
                    {match?.ended_at
                      ? new Date(match.ended_at).toLocaleString("pt-BR", {
                          timeZone: "America/Sao_Paulo",
                        })
                      : "Data ainda não publicada"}
                  </p>
                  {(partners.length > 0 || opponents.length > 0) && (
                    <p className="mt-2 flex items-start gap-2 text-sm text-zinc-400">
                      <Users size={15} aria-hidden="true" />
                      <span>
                        {partners.length > 0 && <>Com {partners.join(", ")}</>}
                        {partners.length > 0 && opponents.length > 0 && " · "}
                        {opponents.length > 0 && (
                          <>Contra {opponents.join(", ")}</>
                        )}
                      </span>
                    </p>
                  )}
                  {stat && (
                    <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-zinc-300">
                      <span className="rounded-full border border-white/10 px-3 py-1.5">
                        Aces {stat.aces}
                      </span>
                      <span className="rounded-full border border-white/10 px-3 py-1.5">
                        Ataques {stat.attacks}
                      </span>
                      <span className="rounded-full border border-white/10 px-3 py-1.5">
                        Bloqueios {stat.blocks}
                      </span>
                      <span className="rounded-full border border-white/10 px-3 py-1.5">
                        Defesas {stat.defenses}
                      </span>
                      <span className="rounded-full border border-white/10 px-3 py-1.5">
                        Assistências {stat.assists}
                      </span>
                    </div>
                  )}
                </div>

                <div className="rounded-ur border border-white/10 bg-black/20 p-4 text-right">
                  <p className="font-display text-3xl font-black">
                    {result ? `${result.score_a} × ${result.score_b}` : "—"}
                  </p>
                  <p className="text-ur-gold mt-1 text-sm font-black">
                    {status}
                  </p>
                </div>

                {(points !== undefined ||
                  result?.result_status === "homologated") && (
                  <div className="rounded-ur border border-white/10 bg-white/[.02] p-4 sm:col-span-2">
                    <p className="text-xs font-black tracking-[.16em] text-zinc-500 uppercase">
                      Impacto competitivo publicado
                    </p>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm">
                      {points !== undefined && !impactsResult.error && (
                        <span>
                          <strong className="text-ur-gold">
                            {points > 0 ? `+${points}` : points} pts
                          </strong>{" "}
                          no ranking
                        </span>
                      )}
                      {result?.result_status === "homologated" && (
                        <span className="flex items-center gap-1">
                          <ShieldCheck
                            size={15}
                            className="text-emerald-400"
                            aria-hidden="true"
                          />
                          Resultado homologado
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {sourceUnavailable && (
        <Card className="border-amber-400/20 bg-amber-400/[.04]">
          <p className="text-xs font-black tracking-[.18em] text-amber-300 uppercase">
            Fonte parcialmente indisponível
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Uma fonte de jogos, estatísticas ou impacto competitivo não
            respondeu. O app não transforma ausência de dados em zero nem
            inventa resultado enquanto a fonte oficial estiver indisponível.
          </p>
        </Card>
      )}
    </section>
  );
}
