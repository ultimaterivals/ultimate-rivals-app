import { redirect } from "next/navigation";
import { Button, Card, PageHeader } from "@/components/ui";
import {
  addRosterMemberAction,
  createRosterAction,
  removeRosterMemberAction,
  rosterStatusAction,
} from "@/features/teams/actions";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  getManagedTeamId,
  getTeamDetail,
} from "@/server/repositories/team360.repository";

const relationName = (value: unknown) =>
  Array.isArray(value)
    ? (value[0] as { name?: string } | undefined)?.name
    : (value as { name?: string } | null)?.name;
export default async function Page() {
  const identity = await requireRole("team_manager"),
    client = await createClient(),
    teamId = await getManagedTeamId(client, identity.userId);
  if (!teamId) redirect("/");
  const [d, { data: seasons }, { data: categories }, { data: formats }] =
    await Promise.all([
      getTeamDetail(client, teamId),
      client.from("seasons").select("id,name"),
      client.from("competitive_categories").select("id,name"),
      client.from("competitive_formats").select("id,name"),
    ]);
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow={d.team.name}
        title="Formações"
        description="Monte duplas e quartetos oficiais respeitando vínculo, categoria e nível."
      />
      <Card>
        <h2 className="text-xl font-black">Nova formação</h2>
        <form
          action={createRosterAction}
          className="mt-3 grid gap-3 md:grid-cols-5"
        >
          <input type="hidden" name="teamId" value={teamId} />
          <input
            name="name"
            placeholder="Nome opcional"
            className="rounded-ur border bg-black p-3"
          />
          <select
            name="seasonId"
            required
            className="rounded-ur border bg-black p-3"
          >
            {seasons?.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
          <select
            name="formatId"
            required
            className="rounded-ur border bg-black p-3"
          >
            {formats?.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
          <select
            name="categoryId"
            required
            className="rounded-ur border bg-black p-3"
          >
            {categories?.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
          <select name="level" className="rounded-ur border bg-black p-3">
            <option value="n3">N3</option>
            <option value="n2">N2</option>
            <option value="n1">N1</option>
          </select>
          <Button type="submit">Criar formação</Button>
        </form>
      </Card>
      {d.rosters.map((r) => {
        const active = r.team_roster_members.filter(
            (m) => m.status === "active",
          ),
          starters = active.filter((m) => m.role === "starter"),
          reserves = active.filter((m) => m.role === "reserve");
        return (
          <Card key={r.id}>
            <p className="text-ur-gold text-xs font-bold uppercase">
              {relationName(r.competitive_formats)} ·{" "}
              {relationName(r.competitive_categories)} · {r.level}
            </p>
            <h2 className="text-2xl font-black">
              {r.name ?? "Formação oficial"}
            </h2>
            <p className="text-zinc-400">
              {r.status} · Titulares {starters.length}/4 · Reservas{" "}
              {reserves.length}/3
            </p>
            <form
              action={addRosterMemberAction}
              className="mt-4 grid gap-3 md:grid-cols-4"
            >
              <input type="hidden" name="rosterId" value={r.id} />
              <select
                name="athleteId"
                required
                className="rounded-ur border bg-black p-3"
              >
                {d.memberships
                  .filter((m) => m.status === "active")
                  .map((m) => (
                    <option key={m.athlete_id} value={m.athlete_id}>
                      {
                        d.directory.find((x) => x.athlete_id === m.athlete_id)
                          ?.public_name
                      }
                    </option>
                  ))}
              </select>
              <select name="role" className="rounded-ur border bg-black p-3">
                <option value="starter">Titular</option>
                <option value="reserve">Reserva</option>
              </select>
              <label className="flex items-center gap-2">
                <input name="isCaptain" type="checkbox" /> Capitão
              </label>
              <Button type="submit">Adicionar</Button>
            </form>
            <div className="mt-4 grid gap-2">
              <h3 className="font-black">Titulares</h3>
              {starters.map((m, i) => (
                <div key={m.id} className="flex justify-between border-t py-2">
                  <span>
                    {i + 1}.{" "}
                    {
                      d.directory.find((x) => x.athlete_id === m.athlete_id)
                        ?.public_name
                    }
                    {m.is_captain ? " · capitão" : ""}
                  </span>
                  <form action={removeRosterMemberAction}>
                    <input type="hidden" name="memberId" value={m.id} />
                    <button className="text-red-300">Encerrar</button>
                  </form>
                </div>
              ))}
              <h3 className="mt-2 font-black">Reservas</h3>
              {reserves.map((m, i) => (
                <div key={m.id} className="flex justify-between border-t py-2">
                  <span>
                    {i + 5}.{" "}
                    {
                      d.directory.find((x) => x.athlete_id === m.athlete_id)
                        ?.public_name
                    }
                    {m.is_captain ? " · capitão" : ""}
                  </span>
                  <form action={removeRosterMemberAction}>
                    <input type="hidden" name="memberId" value={m.id} />
                    <button className="text-red-300">Encerrar</button>
                  </form>
                </div>
              ))}
            </div>
            <form action={rosterStatusAction} className="mt-4">
              <input type="hidden" name="rosterId" value={r.id} />
              <input
                type="hidden"
                name="status"
                value={r.status === "active" ? "archived" : "active"}
              />
              <Button variant="secondary">
                {r.status === "active"
                  ? "Encerrar formação"
                  : "Validar e ativar"}
              </Button>
            </form>
          </Card>
        );
      })}
    </div>
  );
}
