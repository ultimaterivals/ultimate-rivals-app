import { CalendarDays, ShieldCheck, Users } from "lucide-react";
import { Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

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

type AthleteHistoricalResultsProps = {
  athleteId: string;
};

export async function AthleteHistoricalResults({
  athleteId,
}: AthleteHistoricalResultsProps) {
  const client = await createClient();
  const historicalResult = await client
    .from("historical_match_results")
    .select(
      "id,legacy_game_id,occurred_at,time_label,side_a_label,side_b_label,score_a,score_b,winner_side,historical_match_participants(athlete_id,side,athletes(public_name))",
    )
    .order("legacy_game_id", { ascending: false })
    .limit(100);

  const matches = (historicalResult.data ??
    []) as unknown as HistoricalResultRow[];

  if (matches.length === 0) return null;

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
          Registros oficiais anteriores ao aplicativo. Datas não confirmadas
          permanecem sem publicação.
        </p>
      </div>
      {matches.map((match) => {
        const participants = match.historical_match_participants ?? [];
        const own = participants.find(
          (participant) => participant.athlete_id === athleteId,
        );
        const partners = participants
          .filter(
            (participant) =>
              participant.side === own?.side &&
              participant.athlete_id !== athleteId,
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
  );
}
