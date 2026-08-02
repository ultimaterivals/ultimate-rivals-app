import Link from "next/link";
import { Activity, CheckCircle2, TriangleAlert } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { listRankingEngineMatches } from "@/server/repositories/ranking.repository";

const first = <T,>(value: T | T[] | null | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default async function RankingEnginePage() {
  const { matches, runs } = await listRankingEngineMatches(
    await createClient(),
  );
  const latestRun = new Map<string, (typeof runs)[number]>();
  for (const run of runs)
    if (!latestRun.has(run.source_id)) latestRun.set(run.source_id, run);
  const completed = runs.filter((run) => run.status === "completed").length;
  const failed = runs.filter((run) => run.status === "failed").length;
  return (
    <div className="grid gap-7">
      <PageHeader
        eyebrow="Mérito e transações"
        title="Motor de pontuação"
        description="Processamento auditável dos resultados homologados. O ledger é append-only e o ranking visual permanece fora desta tela."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Partidas"
          value={String(matches.length)}
          hint="Resultados homologados/void"
          icon={Activity}
        />
        <StatCard
          label="Processamentos"
          value={String(completed)}
          hint="Execuções concluídas"
          icon={CheckCircle2}
        />
        <StatCard
          label="Falhas"
          value={String(failed)}
          hint="Rollback integral"
          icon={TriangleAlert}
        />
      </div>
      {matches.length === 0 ? (
        <EmptyState
          title="Nenhum resultado processável"
          description="A primeira homologação disparará o motor automaticamente."
        />
      ) : (
        <section
          className="grid gap-3"
          aria-label="Partidas do motor de pontuação"
        >
          {matches.map((result) => {
            const match = first(result.matches);
            const run = latestRun.get(result.match_id);
            return (
              <Link
                key={result.match_id}
                href={`/admin/ranking-engine/matches/${result.match_id}`}
              >
                <Card className="hover:border-ur-gold/60 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-ur-gold text-xs font-bold uppercase">
                        {match?.event_context ?? "ur_play"}
                      </p>
                      <h2 className="text-xl font-black">
                        {match?.match_code ?? result.match_id}
                      </h2>
                      <p className="text-sm text-zinc-400">
                        Resultado {result.score_a} × {result.score_b}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge>{result.result_status}</Badge>
                      <p className="mt-2 text-sm text-zinc-400">
                        {run
                          ? `${run.status} · ${run.transaction_count} transações`
                          : "Aguardando processamento"}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}
