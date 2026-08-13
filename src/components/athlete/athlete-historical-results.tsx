import { CalendarDays, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

type HistoricalResultRow = {
  id: string;
  legacy_game_id: number;
  side_a_label: string;
  side_b_label: string;
  score_a: number;
  score_b: number;
};

export async function AthleteHistoricalResults() {
  const client = await createClient();
  const historicalResult = await client
    .from("historical_match_results")
    .select("id,legacy_game_id,side_a_label,side_b_label,score_a,score_b")
    .order("legacy_game_id", { ascending: false })
    .limit(100);

  const matches = historicalResult.data as HistoricalResultRow[] | null;

  if (!matches?.length) return null;

  return (
    <section className="grid gap-4">
      <div>
        <p className="text-xs font-black tracking-[.16em] text-zinc-500 uppercase">
          Histórico validado
        </p>
        <h2 className="mt-1 text-xl font-black">
          Jogos que construíram seu ranking
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Registros oficiais anteriores ao aplicativo.
        </p>
      </div>
      {matches.map((match) => (
        <Card key={match.id} className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs font-black tracking-[.16em] text-zinc-500 uppercase">
              Registro histórico · Jogo {match.legacy_game_id}
            </p>
            <h3 className="mt-1 text-xl font-black">
              {match.side_a_label} × {match.side_b_label}
            </h3>
            <p className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
              <CalendarDays size={15} aria-hidden="true" />
              Data ainda não publicada
            </p>
          </div>
          <div className="rounded-ur border border-white/10 p-4 text-right">
            <p className="font-display text-3xl font-black">
              {match.score_a} × {match.score_b}
            </p>
            <p className="text-ur-gold mt-1 text-sm font-black">
              Resultado validado
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
      ))}
    </section>
  );
}
