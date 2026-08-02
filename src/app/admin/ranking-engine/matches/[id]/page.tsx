import { notFound } from "next/navigation";
import { Badge, Card, PageHeader } from "@/components/ui";
import { ReprocessButton } from "@/features/ranking/reprocess-button";
import { createClient } from "@/lib/supabase/server";
import { getRankingEngineMatch } from "@/server/repositories/ranking.repository";

const first = <T,>(value: T | T[] | null | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default async function RankingEngineMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let panel;
  try {
    panel = await getRankingEngineMatch(await createClient(), id);
  } catch {
    notFound();
  }
  const match = first(panel.result.matches);
  const activeTotal = panel.transactions.reduce(
    (sum, transaction) =>
      sum + (transaction.status === "homologated" ? transaction.points : 0),
    0,
  );
  return (
    <div className="grid gap-7">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <PageHeader
          eyebrow="Jogo homologado"
          title={match?.match_code ?? id}
          description={`Resultado ${panel.result.score_a} × ${panel.result.score_b} · ${panel.result.result_status}`}
        />
        {panel.result.result_status === "homologated" && (
          <ReprocessButton matchId={id} />
        )}
      </div>
      <Card className="border-ur-gold/40">
        <p className="text-xs font-bold text-zinc-500 uppercase">
          Saldo líquido do jogo
        </p>
        <strong className="text-4xl">
          {activeTotal >= 0 ? "+" : ""}
          {activeTotal}
        </strong>
        <p className="text-sm text-zinc-400">
          Inclui reversals preservados no histórico.
        </p>
      </Card>
      <section className="grid gap-3">
        <h2 className="text-xl font-black">TRANSAÇÕES</h2>
        {panel.transactions.map((transaction) => {
          const athlete = first(transaction.athletes);
          const rule = first(transaction.ranking_rules);
          return (
            <Card key={transaction.id} data-testid="ranking-transaction">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <strong>{athlete?.public_name ?? "Mérito coletivo"}</strong>
                  <p className="text-sm text-zinc-400">
                    {rule?.name ?? transaction.rule_code} · regra v
                    {transaction.rule_version}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {transaction.source_type} · {transaction.source_id}
                  </p>
                </div>
                <div className="text-right">
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
                  <div>
                    <Badge>{transaction.transaction_type}</Badge>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </section>
      <section className="grid gap-3">
        <h2 className="text-xl font-black">PROCESSAMENTOS</h2>
        {panel.runs.map((run) => (
          <Card key={run.id}>
            <div className="flex justify-between gap-4">
              <div>
                <strong>{run.status}</strong>
                <p className="text-sm text-zinc-400">
                  {new Date(run.started_at).toLocaleString("pt-BR")}
                </p>
              </div>
              <p>{run.transaction_count} transações</p>
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
