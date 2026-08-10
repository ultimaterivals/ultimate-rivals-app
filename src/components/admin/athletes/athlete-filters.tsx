import type { AdminAthletesSnapshot } from "@/features/admin-athletes/types";
import { Button, Input, Select } from "@/components/ui";

export function AthleteFilters({
  snapshot,
}: {
  snapshot: AdminAthletesSnapshot;
}) {
  return (
    <form
      method="get"
      className="rounded-ur bg-ur-panel grid gap-3 border p-4 md:grid-cols-[1fr_auto_auto_auto] md:items-end"
    >
      <label className="grid gap-1.5 text-xs font-bold text-zinc-500 uppercase">
        Buscar atleta
        <Input
          name="q"
          defaultValue={snapshot.query.search}
          placeholder="Nome, código ou equipe"
        />
      </label>
      <label className="grid gap-1.5 text-xs font-bold text-zinc-500 uppercase">
        Segmento
        <Select name="segment" defaultValue={snapshot.query.segment}>
          <option value="all">Todos</option>
          <option value="active30">Ativos 30d</option>
          <option value="first-only">Só 1ª participação</option>
          <option value="at-risk">Em risco</option>
          <option value="inactive">Inativos</option>
          <option value="free-agents">Atletas livres</option>
        </Select>
      </label>
      <label className="grid gap-1.5 text-xs font-bold text-zinc-500 uppercase">
        Polo
        <Select name="pole" defaultValue={snapshot.query.poleId ?? "all"}>
          <option value="all">Todos os polos</option>
          {snapshot.poles.map((pole) => (
            <option key={pole.id} value={pole.id}>
              {pole.name}
            </option>
          ))}
        </Select>
      </label>
      <Button type="submit">Aplicar</Button>
    </form>
  );
}
