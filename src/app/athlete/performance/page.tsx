import {
  Activity,
  Award,
  ShieldCheck,
  Swords,
  Target,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  aggregatePerformance,
  getAthleteDashboard,
} from "@/server/services/athlete-experience.service";

const filters = [
  { value: "season", label: "Temporada" },
  { value: "cycle", label: "Ciclo atual" },
  { value: "last", label: "Ãšltimos jogos" },
] as const;

export default async function AthletePerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const identity = await requireRole("athlete");
  const data = await getAthleteDashboard(await createClient(), identity.userId);
  if (!data) notFound();
  const period = (await searchParams).period ?? "season";
  const matches =
    period === "last"
      ? data.matches.slice(0, 5)
      : period === "cycle" && data.currentCycle
        ? data.matches.filter(
            (match) =>
              match.playedAt >= data.currentCycle!.starts_at &&
              match.playedAt <= data.currentCycle!.ends_at,
          )
        : data.matches;
  const performance = aggregatePerformance(matches);
  const stat = performance.total;
  const statCards: [string, string | number, LucideIcon][] = [
    ["Jogos", stat.games, Swords],
    ["VitÃ³rias", stat.wins, Award],
    ["Derrotas", stat.losses, ShieldCheck],
    [
      "MÃ©dia de pontos",
      stat.games
        ? (stat.rankingPoints / stat.games).toLocaleString("pt-BR", {
            maximumFractionDigits: 1,
          })
        : "â€”",
      TrendingUp,
    ],
    ["Aces", stat.aces, Target],
    ["Ataques", stat.attacks, Activity],
    ["Bloqueios", stat.blocks, ShieldCheck],
    ["Defesas / assists", `${stat.defenses} / ${stat.assists}`, Activity],
  ];
  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      <PageHeader
        eyebrow="Meu jogo"
        title="Performance"
        description="EstatÃ­sticas homologadas, preservadas no contexto em que cada partida foi disputada."
      />
      <nav
        aria-label="PerÃ­odo da performance"
        className="flex gap-2 overflow-x-auto pb-1"
      >
        {filters.map((filter) => (
          <Link
            key={filter.value}
            href={`/athlete/performance?period=${filter.value}`}
            scroll={false}
            aria-current={period === filter.value ? "page" : undefined}
            className={`min-h-11 shrink-0 rounded-full border px-4 py-3 text-sm font-black ${period === filter.value ? "bg-ur-gold text-ur-black border-ur-gold" : "text-zinc-400 hover:text-white"}`}
          >
            {filter.label}
          </Link>
        ))}
      </nav>
      {!stat.games ? (
        <EmptyState
          title="Ainda sem jogos neste perÃ­odo"
          description="Escolha outro perÃ­odo ou participe do prÃ³ximo UR Play."
          action={
            <Link href="/athlete/ur-play" className="text-ur-gold font-black">
              ENCONTRAR UR PLAY
            </Link>
          }
        />
      ) : (
        <>
          <Card className="border-ur-gold/40 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <p className="text-ur-gold text-xs font-black tracking-[.18em] uppercase">
                Aproveitamento
              </p>
              <strong className="font-display block text-7xl leading-none">
                {stat.winRate?.toLocaleString("pt-BR", {
                  maximumFractionDigits: 0,
                })}
                %
              </strong>
              <p className="mt-3 text-zinc-400">
                {stat.wins} vitÃ³rias em {stat.games} jogos homologados
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-bold text-zinc-500 uppercase">
                Pontos de ranking
              </p>
              <strong className="text-ur-gold text-4xl">
                +{stat.rankingPoints}
              </strong>
            </div>
          </Card>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {statCards.map(([label, value, Icon]) => (
              <Card key={String(label)} className="p-4">
                <Icon className="text-ur-gold" size={19} aria-hidden="true" />
                <p className="mt-3 text-[.68rem] font-bold text-zinc-500 uppercase">
                  {label as string}
                </p>
                <strong className="mt-1 block text-2xl">
                  {value as string | number}
                </strong>
              </Card>
            ))}
          </div>
          <section className="grid gap-4">
            <h2 className="font-display text-2xl font-black uppercase">
              Por formato
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {performance.byFormat
                .filter((row) => row.games > 0)
                .map((row) => (
                  <PerformanceGroup
                    key={row.format}
                    title={row.format === "doubles" ? "Duplas" : "Quartetos"}
                    row={row}
                  />
                ))}
            </div>
            {performance.byFormat.every((row) => row.games === 0) && (
              <p className="text-sm text-zinc-500">
                Sem amostra homologada por formato.
              </p>
            )}
          </section>
          <section className="grid gap-4">
            <h2 className="font-display text-2xl font-black uppercase">
              HistÃ³rico por nÃ­vel
            </h2>
            <p className="text-sm text-zinc-400">
              Jogos antigos permanecem atribuÃ­dos ao nÃ­vel registrado na
              partida.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              {performance.byLevel
                .filter((row) => row.games > 0)
                .map((row) => (
                  <PerformanceGroup
                    key={row.level}
                    title={row.level.toUpperCase()}
                    row={row}
                  />
                ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function PerformanceGroup({
  title,
  row,
}: {
  title: string;
  row: {
    games: number;
    wins: number;
    winRate: number | null;
    aces: number;
    attacks: number;
  };
}) {
  return (
    <Card>
      <div className="flex items-end justify-between">
        <h3 className="text-xl font-black uppercase">{title}</h3>
        <strong className="text-ur-gold text-2xl">
          {row.winRate?.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%
        </strong>
      </div>
      <div className="mt-5 grid grid-cols-4 gap-2 text-center">
        {[
          ["J", row.games],
          ["V", row.wins],
          ["ACES", row.aces],
          ["ATAQ", row.attacks],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-[.62rem] font-black text-zinc-500">{label}</p>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </Card>
  );
}
