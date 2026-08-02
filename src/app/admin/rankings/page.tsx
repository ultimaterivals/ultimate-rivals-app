import Link from "next/link";
import { Button, Card, Input, PageHeader, Select } from "@/components/ui";
import { RankingTable } from "@/components/ranking/ranking-table";
import { createClient } from "@/lib/supabase/server";
import {
  captureRankingSnapshotAction,
  publishRankingsAction,
} from "@/features/ranking/classification-actions";
import {
  getRankingContext,
  listRankings,
  type RankingType,
} from "@/server/repositories/rankings.repository";

const tabs: Array<[RankingType, string]> = [
  ["individual", "Individual"],
  ["team", "Equipes"],
  ["pole", "Polos"],
  ["doubles", "Duplas"],
  ["fours", "Quartetos"],
];
const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default async function AdminRankingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const client = await createClient();
  const context = await getRankingContext(client);
  const type = (one(params.type) ?? "individual") as RankingType;
  const seasonId = one(params.season) ?? context.seasons[0]?.id;
  const cycleId = one(params.cycle);
  const level = one(params.level);
  const search = one(params.q);
  const rows = await listRankings(client, {
    type,
    seasonId,
    cycleId: cycleId && cycleId !== "season" ? cycleId : undefined,
    level: level && level !== "all" ? level : undefined,
    poleId: one(params.pole),
    teamId: one(params.team),
    search,
    after: Number(one(params.after) ?? 0) || undefined,
  });
  const visible = rows.slice(0, 25);
  const query = new URLSearchParams(
    Object.entries(params).flatMap(([key, value]) =>
      value ? [[key, one(value)!]] : [],
    ),
  );
  const lastPosition = visible.at(-1)?.current_position;
  return (
    <div className="grid gap-7">
      <PageHeader
        eyebrow="Classificações oficiais"
        title="Rankings"
        description="Projeções determinísticas do ledger homologado. Pontos são o critério principal; nível competitivo permanece explícito."
      />
      <nav className="flex gap-2 overflow-x-auto" aria-label="Tipos de ranking">
        {tabs.map(([value, label]) => (
          <Link
            key={value}
            href={`/admin/rankings?type=${value}`}
            className={`rounded-ur min-h-11 px-4 py-3 text-sm font-black uppercase ${type === value ? "bg-ur-gold text-ur-black" : "bg-ur-graphite border"}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <Card>
        <form className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <input type="hidden" name="type" value={type} />
          <Select
            id="season"
            name="season"
            label="Temporada"
            defaultValue={seasonId}
          >
            {context.seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Select
            id="cycle"
            name="cycle"
            label="Período"
            defaultValue={cycleId ?? "season"}
          >
            <option value="season">Trimestre</option>
            {context.cycles
              .filter((c) => c.season_id === seasonId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </Select>
          <Select
            id="level"
            name="level"
            label="Nível"
            defaultValue={level ?? "all"}
          >
            <option value="all">Todos</option>
            <option value="n1">N1</option>
            <option value="n2">N2</option>
            <option value="n3">N3</option>
            <option value="leveling">Em Nivelamento</option>
          </Select>
          <Input
            id="q"
            name="q"
            label="Busca"
            defaultValue={search}
            placeholder="Nome"
          />
          <Select
            id="pole"
            name="pole"
            label="Polo"
            defaultValue={one(params.pole) ?? ""}
          >
            <option value="">Todos</option>
            {context.poles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              Filtrar
            </Button>
          </div>
        </form>
      </Card>
      <div className="flex flex-wrap gap-3">
        {seasonId && (
          <form action={captureRankingSnapshotAction}>
            <input type="hidden" name="seasonId" value={seasonId} />
            <input
              type="hidden"
              name="cycleId"
              value={cycleId && cycleId !== "season" ? cycleId : ""}
            />
            <Button type="submit" variant="secondary">
              Capturar snapshot
            </Button>
          </form>
        )}
        {seasonId && (
          <form action={publishRankingsAction}>
            <input type="hidden" name="seasonId" value={seasonId} />
            <input
              type="hidden"
              name="cycleId"
              value={cycleId && cycleId !== "season" ? cycleId : ""}
            />
            <Button type="submit" variant="secondary">
              Publicar ranking
            </Button>
          </form>
        )}
        <Link
          className="rounded-ur border-ur-line inline-flex min-h-11 items-center border px-5 text-sm font-bold uppercase"
          href={`/admin/rankings/export?${query}`}
        >
          Exportar CSV
        </Link>
      </div>
      <RankingTable rows={visible as Array<Record<string, unknown>>} />
      {rows.length > 25 && lastPosition && (
        <Link
          className="text-ur-gold justify-self-center font-bold"
          href={`/admin/rankings?${new URLSearchParams([...query.entries(), ["after", String(lastPosition)]])}`}
        >
          Próximos 25 →
        </Link>
      )}
    </div>
  );
}
