import { notFound } from "next/navigation";
import { Award, ShieldCheck, Swords, Target } from "lucide-react";
import { RankingMovement } from "@/components/ranking/ranking-movement";
import { Card, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getAthleteRanking } from "@/server/repositories/rankings.repository";
import {
  levelLabel,
  nextPositionTarget,
} from "@/server/services/ranking-classification.service";

export default async function AthleteRankingPage() {
  const identity = await requireRole("athlete");
  const client = await createClient();
  const { data: athlete } = await client
    .from("athletes")
    .select("id")
    .eq("profile_id", identity.userId)
    .maybeSingle();
  if (!athlete) notFound();
  const data = await getAthleteRanking(client, athlete.id);
  if (!data.current)
    return (
      <EmptyState
        title="Você ainda não entrou no ranking"
        description="A primeira transação homologada abrirá sua classificação."
      />
    );
  const r = data.current;
  const target = nextPositionTarget(r, data.peers);
  return (
    <div className="grid gap-7">
      <PageHeader
        eyebrow="Disputa oficial"
        title="Meu ranking"
        description="Sua posição ao vivo na temporada e o caminho até o próximo adversário."
      />
      <Card className="ranking-hero border-ur-gold/50 overflow-hidden">
        <div className="grid gap-8 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <p className="text-ur-gold text-sm font-black uppercase">
              {levelLabel(r.level)}
            </p>
            <strong className="font-display block text-[clamp(5rem,18vw,10rem)] leading-none">
              #{String(r.current_position ?? "—").padStart(2, "0")}
            </strong>
            <RankingMovement movement={r.movement} change={r.position_change} />
          </div>
          <div className="sm:text-right">
            <strong className="text-ur-gold text-5xl font-black">
              {Number(r.total_points).toLocaleString("pt-BR")}
            </strong>
            <p className="font-bold text-zinc-400">PONTOS NA TEMPORADA</p>
            <p className="mt-2 text-sm text-zinc-500">
              #{r.general_position} geral
            </p>
          </div>
        </div>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-xs font-black text-zinc-500 uppercase">
            Mês atual
          </p>
          <strong className="text-3xl">
            +{data.monthly?.total_points ?? 0} pts
          </strong>
        </Card>
        <Card>
          <p className="text-xs font-black text-zinc-500 uppercase">
            Contribuição para sua equipe
          </p>
          <strong className="text-3xl">
            {r.team_name ? r.total_points : 0} pts
          </strong>
          <p className="text-sm text-zinc-500">
            {r.team_name ?? "Sem equipe vinculada"}
          </p>
        </Card>
      </div>
      {target ? (
        <Card className="border-ur-gold/30">
          <p className="text-xs font-black text-zinc-500 uppercase">
            Próxima posição
          </p>
          <div className="mt-2 flex items-end justify-between gap-4">
            <div>
              <strong className="text-2xl">
                #{target.current_position} {target.display_name}
              </strong>
              <p className="text-zinc-400">{target.total_points} pts</p>
            </div>
            <div className="text-right">
              <Target className="text-ur-gold ml-auto" />
              <strong className="text-ur-gold text-2xl">
                Faltam {target.pointsBehind} pts
              </strong>
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <Award className="text-ur-gold" />
          <strong className="mt-2 block text-xl">Você lidera este nível</strong>
        </Card>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Jogos"
          value={String(r.games_played)}
          hint={`${r.wins} vitórias · ${r.losses} derrotas`}
          icon={Swords}
        />
        <StatCard
          label="Aproveitamento"
          value={`${Number(r.win_rate).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
          hint="Indicador secundário"
          icon={ShieldCheck}
        />
        <StatCard
          label="Aces / ataques"
          value={`${r.aces} / ${r.attacks}`}
          hint="Ações homologadas"
          icon={Award}
        />
        <StatCard
          label="Bloqueios / defesas"
          value={`${r.blocks} / ${r.defenses}`}
          hint={`${r.assists} assistências`}
          icon={Award}
        />
      </div>
      <section>
        <h2 className="mb-3 text-xl font-black">HISTÓRICO DE POSIÇÕES</h2>
        {data.history.length ? (
          <div className="grid gap-3">
            {data.history.map((h, i) => (
              <Card key={`${h.captured_at}-${i}`}>
                <div className="flex justify-between">
                  <span>
                    {new Date(h.captured_at).toLocaleDateString("pt-BR")} ·{" "}
                    {h.snapshot_reason}
                  </span>
                  <strong>
                    #{h.position} · {h.total_points} pts
                  </strong>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-zinc-500">
            O primeiro snapshot iniciará sua timeline.
          </p>
        )}
      </section>
    </div>
  );
}
