import { Card, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getAthletePoints } from "@/server/repositories/ranking.repository";
import { explainRankingRule } from "@/server/services/ranking-engine.service";
import { Award, MinusCircle, ShieldCheck, Swords } from "lucide-react";
import { notFound } from "next/navigation";

export default async function AthletePointsPage() {
  const identity = await requireRole("athlete");
  const client = await createClient();
  const { data: athlete } = await client
    .from("athletes")
    .select("id")
    .eq("profile_id", identity.userId)
    .single();
  if (!athlete) notFound();
  const { totals, history } = await getAthletePoints(client, athlete.id);
  return (
    <div className="grid gap-7">
      <PageHeader
        eyebrow="Mérito oficial"
        title="Meus pontos"
        description="Pontos da temporada derivados somente de eventos homologados. Posição no ranking ainda não faz parte desta entrega."
      />
      <Card className="border-ur-gold/50 bg-gradient-to-br from-[#1b1b1b] to-[#111]">
        <p className="text-ur-gold text-xs font-black tracking-[.18em] uppercase">
          Pontos da temporada
        </p>
        <strong className="mt-2 block text-6xl font-black">
          {totals?.total_points ?? 0}
        </strong>
        <p className="text-sm text-zinc-400">Saldo líquido homologado</p>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Participação"
          value={String(totals?.participation_points ?? 0)}
          hint="Presença efetiva em jogo"
          icon={ShieldCheck}
        />
        <StatCard
          label="Resultados"
          value={String(totals?.result_points ?? 0)}
          hint="Vitórias e derrotas"
          icon={Swords}
        />
        <StatCard
          label="Ações técnicas"
          value={String(totals?.technical_points ?? 0)}
          hint="Aces, ataques e mais"
          icon={Award}
        />
        <StatCard
          label="Bônus / penalidades"
          value={String(
            (totals?.bonus_points ?? 0) + (totals?.penalty_points ?? 0),
          )}
          hint="Méritos e disciplina"
          icon={MinusCircle}
        />
      </div>
      <section className="grid gap-3">
        <h2 className="text-xl font-black">HISTÓRICO</h2>
        {history.length === 0 ? (
          <EmptyState
            title="Nenhuma pontuação homologada"
            description="Seu histórico aparecerá após a homologação de uma partida com participação efetiva."
          />
        ) : (
          history.map((transaction) => (
            <Card key={transaction.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase">
                    {new Date(transaction.created_at).toLocaleDateString(
                      "pt-BR",
                      { day: "2-digit", month: "short" },
                    )}{" "}
                    · UR Play
                  </p>
                  <strong>{explainRankingRule(transaction.rule_code)}</strong>
                  <p className="text-sm text-zinc-400">
                    {transaction.match_code ??
                      transaction.session_name ??
                      "Evento homologado"}
                  </p>
                </div>
                <strong
                  className={
                    transaction.points < 0
                      ? "text-2xl text-red-400"
                      : "text-ur-gold text-2xl"
                  }
                >
                  {transaction.points > 0 ? "+" : ""}
                  {transaction.points}
                </strong>
              </div>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
