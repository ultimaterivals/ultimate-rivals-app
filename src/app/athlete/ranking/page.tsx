import { Award, ShieldCheck, Swords, Target } from "lucide-react";
import { RankingMovement } from "@/components/ranking/ranking-movement";
import { Card, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { EngagementViewEvent } from "@/features/engagement/engagement-client";
import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";
import { createClient } from "@/lib/supabase/server";
import { getAthleteRanking } from "@/server/repositories/rankings.repository";
import {
  levelLabel,
  nextPositionTarget,
} from "@/server/services/ranking-classification.service";

export default async function AthleteRankingPage() {
  const viewer = await requireAthleteViewer();
  const client = await createClient();
  const athlete = { id: viewer.athleteId };
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
  const nearby = data.peers.filter((peer) => {
    const distance =
      Number(peer.current_position ?? 0) - Number(r.current_position ?? 0);
    return distance >= -2 && distance <= 2;
  });

  return (
    <div className="grid gap-7">
      <EngagementViewEvent
        eventName="ranking_viewed"
        athleteId={athlete.id}
        objectType="ranking"
        metadata={{
          ranking_scope: "individual",
          route: "/athlete/ranking",
          source: "athlete_portal",
          is_self: true,
        }}
        dedupKey={`athlete-ranking:${athlete.id}`}
      />
      <EngagementViewEvent
        eventName="ranking_own_position_viewed"
        athleteId={athlete.id}
        objectType="athlete"
        objectId={athlete.id}
        metadata={{
          ranking_scope: "individual",
          route: "/athlete/ranking",
          position: r.current_position ?? null,
          is_self: true,
        }}
        dedupKey={`athlete-ranking-own:${athlete.id}:${r.current_position}`}
      />
      <PageHeader
        eyebrow="Disputa oficial"
        title="Meu ranking"
        description="Sua posição ao vivo na temporada, seus rivais próximos e o delta bruto para a próxima colocação."
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

      <Card>
        <p className="text-xs font-black text-zinc-500 uppercase">
          Rivais próximos
        </p>
        <div className="mt-3 grid gap-2">
          {nearby.map((peer) => {
            const isSelf = peer.entity_id === athlete.id;
            return (
              <div
                key={`${peer.current_position}-${peer.entity_id}`}
                className={`rounded-ur flex items-center justify-between border p-3 ${
                  isSelf
                    ? "border-ur-gold bg-ur-gold/10 text-ur-gold"
                    : "border-white/10"
                }`}
              >
                <span className="font-bold">
                  #{peer.current_position} · {peer.display_name}
                  {isSelf ? " · você" : ""}
                </span>
                <strong>{peer.total_points} pts</strong>
              </div>
            );
          })}
        </div>
      </Card>

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
        <h2 className="mb-3 text-xl font-black">Histórico de posições</h2>
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
