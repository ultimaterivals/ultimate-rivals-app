import Link from "next/link";
import { notFound } from "next/navigation";
import { Button, Card, PageHeader } from "@/components/ui";
import {
  addRosterMemberAction,
  archiveTeamAction,
  addTeamAthleteAction,
  assignTeamManagerAction,
  assignTeamPoleAction,
  createRosterAction,
  endMembershipAction,
  removeRosterMemberAction,
  rosterStatusAction,
} from "@/features/teams/actions";
import { TeamLogoUpload } from "@/features/teams/team-logo-upload";
import { createClient } from "@/lib/supabase/server";
import { getTeamDetail } from "@/server/repositories/team360.repository";

const relationName = (value: unknown) =>
  Array.isArray(value)
    ? (value[0] as { name?: string } | undefined)?.name
    : (value as { name?: string } | null)?.name;
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params,
    c = await createClient();
  let d;
  try {
    d = await getTeamDetail(c, id);
  } catch {
    return notFound();
  }
  const [
    { data: seasons },
    { data: poles },
    { data: profiles },
    { data: categories },
    { data: formats },
  ] = await Promise.all([
    c.from("seasons").select("id,name"),
    c.from("poles").select("id,name"),
    c.from("profiles").select("id,display_name").eq("status", "active"),
    c.from("competitive_categories").select("id,name,code"),
    c.from("competitive_formats").select("id,name,code"),
  ]);
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow={relationName(d.team.poles) ?? "Polo oficial"}
        title={d.team.name}
        description={`${d.team.status} · ${d.team.description ?? "Clube oficial Ultimate Rivals"}`}
      />
      <div className="flex gap-3">
        <Link
          href={`/admin/teams/${id}/edit`}
          className="rounded-ur border px-4 py-3 font-bold"
        >
          Editar identidade
        </Link>
        {d.team.status !== "archived" && (
          <form action={archiveTeamAction}>
            <input type="hidden" name="teamId" value={id} />
            <Button variant="secondary">Arquivar equipe</Button>
          </form>
        )}
      </div>
      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-xl font-black">Escudo</h2>
          <TeamLogoUpload teamId={id} />
        </Card>
        <Card>
          <h2 className="text-xl font-black">Polo oficial</h2>
          <form action={assignTeamPoleAction} className="mt-3 grid gap-3">
            <input type="hidden" name="teamId" value={id} />
            <select
              name="poleId"
              required
              className="rounded-ur border bg-black p-3"
            >
              {poles?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              name="seasonId"
              required
              className="rounded-ur border bg-black p-3"
            >
              {seasons?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <input
              name="startsAt"
              type="datetime-local"
              required
              className="rounded-ur border bg-black p-3"
            />
            <Button type="submit">Registrar mudança</Button>
          </form>
        </Card>
      </section>
      <Card>
        <h2 className="text-xl font-black">Responsáveis</h2>
        <form
          action={assignTeamManagerAction}
          className="mt-3 grid gap-3 md:grid-cols-4"
        >
          <input type="hidden" name="teamId" value={id} />
          <select
            name="profileId"
            required
            className="rounded-ur border bg-black p-3"
          >
            {profiles?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.display_name}
              </option>
            ))}
          </select>
          <select
            name="managementRole"
            className="rounded-ur border bg-black p-3"
          >
            <option value="owner">Owner</option>
            <option value="manager">Manager</option>
            <option value="assistant">Assistant</option>
          </select>
          <input
            name="startsAt"
            type="datetime-local"
            required
            className="rounded-ur border bg-black p-3"
          />
          <Button type="submit">Atribuir</Button>
        </form>
        <div className="mt-4 grid gap-2">
          {d.managers.map((m) => (
            <p key={m.id}>
              {m.management_role} · {m.status} · {relationName(m.profiles)}
            </p>
          ))}
        </div>
      </Card>
      <Card>
        <h2 className="text-xl font-black">Atletas e vínculos</h2>
        <form
          action={addTeamAthleteAction}
          className="mt-3 grid gap-3 md:grid-cols-5"
        >
          <input type="hidden" name="teamId" value={id} />
          <select
            name="athleteId"
            required
            className="rounded-ur border bg-black p-3"
          >
            {d.directory.map((x) => (
              <option value={x.athlete_id} key={x.athlete_id}>
                {x.athlete_code} · {x.public_name}
              </option>
            ))}
          </select>
          <select
            name="seasonId"
            required
            className="rounded-ur border bg-black p-3"
          >
            {seasons?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            name="membershipType"
            className="rounded-ur border bg-black p-3"
          >
            <option value="athlete">Atleta</option>
            <option value="captain">Capitão</option>
          </select>
          <input
            name="startsAt"
            type="datetime-local"
            required
            className="rounded-ur border bg-black p-3"
          />
          <Button type="submit">Adicionar</Button>
        </form>
        <div className="mt-4 grid gap-2">
          {d.memberships.map((m) => (
            <div
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-2 border-t pt-2"
            >
              <span>
                {d.directory.find((x) => x.athlete_id === m.athlete_id)
                  ?.public_name ?? m.athlete_id}{" "}
                · {m.membership_type} · {m.status}
              </span>
              {m.status === "active" && (
                <form action={endMembershipAction}>
                  <input type="hidden" name="membershipId" value={m.id} />
                  <Button variant="secondary">Encerrar</Button>
                </form>
              )}
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <h2 className="text-xl font-black">Criar formação</h2>
        <form
          action={createRosterAction}
          className="mt-3 grid gap-3 md:grid-cols-5"
        >
          <input type="hidden" name="teamId" value={id} />
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
            {seasons?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            name="formatId"
            required
            className="rounded-ur border bg-black p-3"
          >
            {formats?.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
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
          <Button type="submit">Criar</Button>
        </form>
      </Card>
      <section className="grid gap-4">
        {d.rosters.map((r) => (
          <Card key={r.id}>
            <h3 className="text-xl font-black">
              {r.name ?? relationName(r.competitive_formats)} ·{" "}
              {relationName(r.competitive_categories)} · {r.level}
            </h3>
            <p className="text-zinc-400">
              {r.status} ·{" "}
              {
                r.team_roster_members.filter((m) => m.status === "active")
                  .length
              }{" "}
              membros
            </p>
            <form
              action={addRosterMemberAction}
              className="mt-3 grid gap-3 md:grid-cols-4"
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
                    <option value={m.athlete_id} key={m.athlete_id}>
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
                <input type="checkbox" name="isCaptain" /> Capitão
              </label>
              <Button type="submit">Adicionar membro</Button>
            </form>
            <div className="mt-3">
              {r.team_roster_members.map((m) => (
                <div key={m.id} className="flex justify-between border-t py-2">
                  <span>
                    {
                      d.directory.find((x) => x.athlete_id === m.athlete_id)
                        ?.public_name
                    }{" "}
                    · {m.role}
                    {m.is_captain ? " · capitão" : ""}
                  </span>
                  {m.status === "active" && (
                    <form action={removeRosterMemberAction}>
                      <input name="memberId" type="hidden" value={m.id} />
                      <button className="text-red-300">Encerrar</button>
                    </form>
                  )}
                </div>
              ))}
            </div>
            {r.status !== "archived" && (
              <form action={rosterStatusAction} className="mt-3">
                <input name="rosterId" type="hidden" value={r.id} />
                <input
                  name="status"
                  type="hidden"
                  value={r.status === "active" ? "archived" : "active"}
                />
                <Button variant="secondary">
                  {r.status === "active"
                    ? "Encerrar formação"
                    : "Ativar formação"}
                </Button>
              </form>
            )}
          </Card>
        ))}
      </section>
      <Card>
        <h2 className="text-xl font-black">Histórico de polo</h2>
        {d.poleHistory.map((p) => (
          <p key={p.id}>
            {relationName(p.poles)} · {p.starts_at} → {p.ends_at ?? "atual"}
          </p>
        ))}
      </Card>
      <Card>
        <h2 className="text-xl font-black">Auditoria</h2>
        {d.audit.map((a) => (
          <p key={a.id}>
            {a.action} · {a.entity_type} · {a.created_at}
          </p>
        ))}
      </Card>
    </div>
  );
}
