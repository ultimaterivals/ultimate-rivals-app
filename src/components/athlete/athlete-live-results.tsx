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

type TechnicalSummary = {
  match_id: string;
  aces: number | null;
  attacks: number | null;
  blocks: number | null;
  defenses: number | null;
  assists: number | null;
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

function statValue(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : String(value);
}

function ResultStatistics({ stat }: { stat: TechnicalSummary | undefined }) {
  if (!stat) return null;

  const values = [
    ["Aces", stat.aces],
    ["Ataques", stat.attacks],
    ["Bloqueios", stat.blocks],
    ["Defesas", stat.defenses],
    ["Assistências", stat.assists],
  ] as const;

  return (
    <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-5">
      {values.map(([label, value]) => (
        <div key={label} className="bg-black/70 px-3 py-3 text-center">
          <p className="text-[10px] font-black tracking-[.14em] text-zinc-500 uppercase">
            {label}
          </p>
          <p className="font-display mt-1 text-xl font-black text-white">
            {statValue(value)}
          </p>
        </div>
      ))}
    </div>
  );
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
  const stats = new Map<string, TechnicalSummary>(
    ((statisticsResult.data ?? []) as TechnicalSummary[]).map((row) => [
      row.match_id,
      row,
    ]),
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
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-ur-gold text-xs font-black tracking-[.18em] uppercase">
            Últimos resultados
          </p>
          <h2
            id="current-results-title"
            className="font-display mt-1 text-3xl font-black sm:text-4xl"
          >
            O que aconteceu em quadra
          </h2>
        </div>
        {matches.length > 0 && (
          <p className="hidden text-xs font-bold tracking-[.12em] text-zinc-500 uppercase sm:block">
            Operação nativa atual
          </p>
        )}
      </div>

      {matches.length === 0 && !matchesResult.error ? (
        <Card className="rounded-[24px] border-white/10 bg-white/[.025] p-6">
          <Trophy className="text-ur-gold" aria-hidden="true" />
          <h3 className="mt-3 text-xl font-black">
            Nenhum resultado atual publicado
          </h3>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Seus resultados homologados aparecerão aqui depois das partidas. Se
            houver histórico oficial anterior, ele continua preservado abaixo.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {matches.map((entry, index) => {
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
            const highlighted = index === 0;

            return (
              <article
                key={entry.match_id}
                className={`relative overflow-hidden rounded-[26px] border bg-[linear-gradient(145deg,rgba(18,18,18,.98),rgba(5,5,5,.98))] p-5 shadow-xl sm:p-6 ${
                  highlighted
                    ? "border-ur-gold/40 shadow-ur-gold/5"
                    : "border-white/10"
                }`}
              >
                {highlighted && (
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ur-gold to-transparent" />
                )}
                <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      {highlighted && (
                        <span className="rounded-full border border-ur-gold/30 bg-ur-gold/10 px-2.5 py-1 text-[10px] font-black tracking-[.12em] text-ur-gold uppercase">
                          Último jogo
                        </span>
                      )}
                      <p className="text-xs font-black tracking-[.16em] text-zinc-500 uppercase">
                        {match?.ur_play_sessions?.name ?? "Jogo oficial"}
                      </p>
                    </div>

                    <h3 className="font-display mt-3 text-2xl font-black text-white sm:text-3xl">
                      {match?.match_code ?? "Partida oficial"}
                    </h3>

                    <div className="mt-4 grid gap-2 text-sm text-zinc-400">
                      <p className="flex items-center gap-2">
                        <CalendarDays size={15} aria-hidden="true" />
                        {match?.ended_at
                          ? new Date(match.ended_at).toLocaleString("pt-BR", {
                              timeZone: "America/Sao_Paulo",
                            })
                          : "Data ainda não publicada"}
                      </p>
                      {(partners.length > 0 || opponents.length > 0) && (
                        <p className="flex items-start gap-2">
                          <Users size={15} className="mt-0.5" aria-hidden="true" />
                          <span>
                            {partners.length > 0 && <>Com {partners.join(", ")}</>}
                            {partners.length > 0 && opponents.length > 0 && " · "}
                            {opponents.length > 0 && (
                              <>Contra {opponents.join(", ")}</>
                            )}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="min-w-36 rounded-2xl border border-white/10 bg-black/35 px-5 py-4 text-center sm:text-right">
                    <p className="font-display text-4xl font-black text-white sm:text-5xl">
                      {result ? `${result.score_a} × ${result.score_b}` : "—"}
                    </p>
                    <p className="text-ur-gold mt-1 text-sm font-black uppercase">
                      {status}
                    </p>
                  </div>
                </div>

                <ResultStatistics stat={stat} />

                {(points !== undefined ||
                  result?.result_status === "homologated") && (
                  <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-4 text-sm text-zinc-300">
                    {points !== undefined && !impactsResult.error && (
                      <span>
                        Impacto oficial no ranking:{" "}
                        <strong className="text-ur-gold">
                          {points > 0 ? `+${points}` : points} pts
                        </strong>
                      </span>
                    )}
                    {result?.result_status === "homologated" && (
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck
                          size={15}
                          className="text-emerald-400"
                          aria-hidden="true"
                        />
                        Resultado homologado
                      </span>
                    )}
                  </div>
                )}
              </article>
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
            Uma fonte de jogos, estatísticas ou impacto competitivo não respondeu.
            O app preserva os fatos disponíveis, não transforma ausência em zero e
            não inventa resultado enquanto a fonte oficial estiver indisponível.
          </p>
        </Card>
      )}
    </section>
  );
}
