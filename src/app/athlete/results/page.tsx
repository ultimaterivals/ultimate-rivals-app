import { CalendarDays, ShieldCheck, Trophy, Users } from "lucide-react";
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
    match_participants: {
      athlete_id: string;
      side_id: string;
      athletes: { public_name: string } | null;
    }[];
  } | null;
};

type HistoricalResultRow = {
  id: string;
  legacy_game_id: number;
  occurred_at: string | null;
  time_label: string | null;
  side_a_label: string;
  side_b_label: string;
  score_a: number;
  score_b: number;
  winner_side: "A" | "B";
  historical_match_participants: {
    athlete_id: string;
    side: "A" | "B";
    athletes: { public_name: string } | null;
  }[];
};

export default async function AthleteResultsPage() {
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
  const historicalResult = await client
    .from("historical_match_results")
    .select(
      "id,legacy_game_id,occurred_at,time_label,side_a_label,side_b_label,score_a,score_b,winner_side,historical_match_participants(athlete_id,side,athletes(public_name))",
    )
    .order("legacy_game_id", { ascending: false })
    .limit(100);

  const matches = (matchesResult.data ?? []) as unknown as ResultRow[];
  const historicalMatches = (historicalResult.data ??
    []) as unknown as HistoricalResultRow[];
  const stats = new Map(
    (statisticsResult.data ?? []).map((row) => [row.match_id, row]),
  );
  const impacts = new Map<string, number>();
  for (const impact of impactsResult.data ?? []) {
    if (impact.match_id)
      impacts.set(
        impact.match_id,
        (impacts.get(impact.match_id) ?? 0) + impact.points_applied,
      );
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <PageHeader
        eyebrow="Resultados"
        title="Seus jogos oficiais"
        description="Placares e estatísticas dos seus jogos. Seu ranking é atualizado com os resultados confirmados."
      />
      {matches.length === 0 && historicalMatches.length === 0 ? (
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
        <>
          {matches.length > 0 && (
            <section className="grid gap-4">
              {matches.map((entry) => {
                const match = entry.matches;
                const result = match?.match_results;
                const won = result?.winner_side_id === entry.side_id;
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
                    {(points !== undefined ||
                      result?.result_status === "homologated") && (
                      <div className="rounded-ur border border-white/10 bg-white/[.02] p-4 sm:col-span-2">
                        <p className="text-xs font-black tracking-[.16em] text-zinc-500 uppercase">
                          Impacto
                        </p>
                        <div className="mt-2 flex flex-wrap gap-4 text-sm">
                          {points !== undefined && (
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
                              />{" "}
                              Resultado homologado
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </section>
          )}
          {historicalMatches.length > 0 && (
            <section className="grid gap-4">
              <div>
                <p className="text-xs font-black tracking-[.16em] text-zinc-500 uppercase">
                  Histórico validado
                </p>
                <h2 className="mt-1 text-xl font-black">
                  Jogos que construíram seu ranking
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Registros oficiais anteriores ao aplicativo. Datas não
                  confirmadas permanecem sem publicação.
                </p>
              </div>
              {historicalMatches.map((match) => {
                const participants = match.historical_match_participants ?? [];
                const own = participants.find(
                  (participant) => participant.athlete_id === viewer.athleteId,
                );
                const partners = participants
                  .filter(
                    (participant) =>
                      participant.side === own?.side &&
                      participant.athlete_id !== viewer.athleteId,
                  )
                  .map((participant) => participant.athletes?.public_name)
                  .filter(Boolean);
                const opponents = participants
                  .filter((participant) => participant.side !== own?.side)
                  .map((participant) => participant.athletes?.public_name)
                  .filter(Boolean);
                const won = own?.side === match.winner_side;
                const when = match.occurred_at
                  ? new Date(match.occurred_at).toLocaleString("pt-BR")
                  : match.time_label
                    ? `Horário registrado: ${match.time_label} · Data não publicada`
                    : "Data ainda não publicada";
                return (
                  <Card
                    key={match.id}
                    className="grid gap-4 sm:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <p className="text-xs font-black tracking-[.16em] text-zinc-500 uppercase">
                        Registro histórico · Jogo {match.legacy_game_id}
                      </p>
                      <h3 className="mt-1 text-xl font-black">
                        {match.side_a_label} × {match.side_b_label}
                      </h3>
                      <p className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
                        <CalendarDays size={15} aria-hidden="true" />
                        {when}
                      </p>
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
                    </div>
                    <div className="rounded-ur border border-white/10 p-4 text-right">
                      <p className="font-display text-3xl font-black">
                        {match.score_a} × {match.score_b}
                      </p>
                      <p className="text-ur-gold mt-1 text-sm font-black">
                        {won ? "Vitória validada" : "Resultado validado"}
                      </p>
                      <p className="mt-2 flex items-center justify-end gap-1 text-xs text-zinc-500">
                        <ShieldCheck
                          size={14}
                          className="text-emerald-400"
                          aria-hidden="true"
                        />{" "}
                        Base oficial
                      </p>
                    </div>
                  </Card>
                );
              })}
            </section>
          )}
        </>
      )}
      {(matchesResult.error ||
        statisticsResult.error ||
        historicalResult.error) && (
        <p className="text-sm text-zinc-500">
          Uma fonte de resultados está temporariamente indisponível.
        </p>
      )}
    </div>
  );
}
