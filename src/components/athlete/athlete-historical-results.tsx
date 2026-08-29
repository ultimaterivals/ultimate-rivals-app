import { CalendarDays, ShieldCheck, Trophy } from "lucide-react";
import { Card } from "@/components/ui";
import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";
import { createClient } from "@/lib/supabase/server";

type HistoricalResultRow = {
  id: string;
  legacy_game_id: number;
  occurred_at: string | null;
  side_a_label: string;
  side_b_label: string;
  score_a: number;
  score_b: number;
  winner_side: "A" | "B";
};

function historicalDateLabel(occurredAt: string | null) {
  if (!occurredAt) return "Data não registrada na fonte histórica";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(occurredAt));
}

export async function AthleteHistoricalResults() {
  const viewer = await requireAthleteViewer();
  const client = await createClient();
  const historicalResult = await client.rpc(
    "get_athlete_historical_match_results",
    { p_athlete_id: viewer.athleteId },
  );
  const matches = (historicalResult.data ?? []) as HistoricalResultRow[];

  return (
    <section aria-labelledby="historical-results-title" className="grid gap-4">
      <div>
        <p className="text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
          Histórico oficial
        </p>
        <h2
          id="historical-results-title"
          className="font-display mt-1 text-2xl font-black sm:text-3xl"
        >
          Sua trajetória antes do app
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
          Jogos homologados e importados para preservar sua carreira no Ultimate
          Rivals. Eles participam da trajetória competitiva conforme as regras
          oficiais, sem fabricar reserva, check-in, equipe, UR Coins ou qualquer
          outro dado retroativo que não exista na fonte.
        </p>
        <p className="mt-2 text-sm font-bold text-zinc-300">
          Não alteram automaticamente ranking ou UR Coins.
        </p>
      </div>

      {historicalResult.error ? (
        <Card className="border-amber-400/20 bg-amber-400/[.04]">
          <p className="text-xs font-black tracking-[.18em] text-amber-300 uppercase">
            Histórico temporariamente indisponível
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            A fonte oficial não respondeu. O app não interpreta essa falha como
            ausência de jogos nem cria registros substitutos.
          </p>
        </Card>
      ) : matches.length === 0 ? (
        <Card>
          <ShieldCheck className="text-ur-gold" aria-hidden="true" />
          <h3 className="mt-3 text-xl font-black">
            Nenhum jogo histórico disponível
          </h3>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Não há registro histórico homologado disponível para esta conta na
            fonte oficial.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {matches.map((match) => {
            const winnerLabel =
              match.winner_side === "A"
                ? match.side_a_label
                : match.side_b_label;

            return (
              <Card
                key={match.id}
                className="grid gap-4 sm:grid-cols-[1fr_auto]"
              >
                <div>
                  <p className="text-xs font-black tracking-[.16em] text-zinc-500 uppercase">
                    Registro histórico homologado
                  </p>
                  <h3 className="mt-1 text-xl font-black">
                    {match.side_a_label} × {match.side_b_label}
                  </h3>
                  <p className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
                    <CalendarDays size={15} aria-hidden="true" />
                    {historicalDateLabel(match.occurred_at)}
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-sm text-zinc-300">
                    <Trophy
                      size={15}
                      className="text-ur-gold"
                      aria-hidden="true"
                    />
                    Vencedor do jogo: <strong>{winnerLabel}</strong>
                  </p>
                </div>
                <div className="rounded-ur border border-white/10 bg-black/20 p-4 text-right">
                  <p className="font-display text-3xl font-black">
                    {match.score_a} × {match.score_b}
                  </p>
                  <p className="text-ur-gold mt-1 text-sm font-black">
                    Resultado homologado
                  </p>
                  <p className="mt-2 flex items-center justify-end gap-1 text-xs text-zinc-500">
                    <ShieldCheck
                      size={14}
                      className="text-emerald-400"
                      aria-hidden="true"
                    />
                    Base oficial
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
