import { CalendarDays, ShieldCheck, Trophy } from "lucide-react";
import { Card } from "@/components/ui";
import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";
import { createClient } from "@/lib/supabase/server";

type HistoricalResultRow = {
  id: string;
  occurred_at: string | null;
  side_a_label: string;
  side_b_label: string;
  score_a: number;
  score_b: number;
  winner_side: "A" | "B";
};

function historicalDateLabel(occurredAt: string | null) {
  if (!occurredAt) return "Data não registrada no histórico";

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
  const datedMatches = matches.filter((match) => match.occurred_at !== null);
  const undatedMatches = matches.filter((match) => match.occurred_at === null);

  const renderMatch = (match: HistoricalResultRow) => {
    const winnerLabel =
      match.winner_side === "A" ? match.side_a_label : match.side_b_label;

    return (
      <article
        key={match.id}
        className="relative overflow-hidden rounded-[22px] border border-white/10 bg-[linear-gradient(145deg,rgba(17,17,17,.96),rgba(5,5,5,.98))] p-5"
      >
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <p className="text-xs font-black tracking-[.16em] text-zinc-500 uppercase">
              Resultado oficial
            </p>
            <h3 className="font-display mt-2 text-2xl font-black text-white">
              {match.side_a_label} × {match.side_b_label}
            </h3>
            <p className="mt-3 flex items-center gap-2 text-sm text-zinc-400">
              <CalendarDays size={15} aria-hidden="true" />
              {historicalDateLabel(match.occurred_at)}
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm text-zinc-300">
              <Trophy size={15} className="text-ur-gold" aria-hidden="true" />
              Vencedor: <strong>{winnerLabel}</strong>
            </p>
          </div>
          <div className="border-ur-gold/20 bg-ur-gold/[.035] rounded-2xl border px-5 py-4 text-center sm:text-right">
            <p className="font-display text-4xl font-black text-white">
              {match.score_a} × {match.score_b}
            </p>
            <p className="text-ur-gold mt-1 text-xs font-black tracking-[.12em] uppercase">
              Homologado
            </p>
          </div>
        </div>
      </article>
    );
  };

  return (
    <section aria-labelledby="historical-results-title" className="grid gap-5">
      <div className="border-t border-white/10 pt-7">
        <p className="text-ur-gold text-xs font-black tracking-[.18em] uppercase">
          Histórico oficial anterior
        </p>
        <h2
          id="historical-results-title"
          className="font-display mt-1 text-3xl font-black sm:text-4xl"
        >
          Sua história começou antes do app
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
          Jogos já homologados continuam compondo sua trajetória esportiva. O
          app preserva o que existe na fonte e não reconstrói retroativamente
          data, equipe, formação, check-in, arena, UR Coins ou qualquer outro
          fato sem evidência.
        </p>
        <div className="mt-4 flex items-center gap-2 text-sm font-bold text-zinc-300">
          <ShieldCheck
            size={16}
            className="text-emerald-400"
            aria-hidden="true"
          />
          Histórico homologado integra a carreira.
        </div>
        <p className="mt-2 text-xs leading-5 text-zinc-500">
          Estes registros não atribuem Ranking Points ou UR Coins
          automaticamente.
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
        <Card className="rounded-[22px] border-white/10 bg-white/[.025] p-6">
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
        <div className="grid gap-6">
          {datedMatches.length > 0 && (
            <div className="grid gap-3">
              <p className="text-xs font-black tracking-[.16em] text-zinc-500 uppercase">
                Registros com data comprovada
              </p>
              {datedMatches.map(renderMatch)}
            </div>
          )}

          {undatedMatches.length > 0 && (
            <div className="grid gap-3">
              <div>
                <p className="text-xs font-black tracking-[.16em] text-zinc-500 uppercase">
                  Registros sem data comprovada
                </p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Permanecem separados para não atribuir mês ou ordem
                  cronológica artificialmente.
                </p>
              </div>
              {undatedMatches.map(renderMatch)}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
