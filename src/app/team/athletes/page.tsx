import { redirect } from "next/navigation";
import { PageHeader, Card, Button } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  getManagedTeamId,
  getTeamDetail,
} from "@/server/repositories/team360.repository";
import {
  addTeamAthleteAction,
  endMembershipAction,
} from "@/features/teams/actions";
export default async function Page() {
  const a = await requireRole("team_manager"),
    c = await createClient(),
    id = await getManagedTeamId(c, a.userId);
  if (!id) redirect("/");
  const d = await getTeamDetail(c, id);
  const { data: seasons } = await c.from("seasons").select("id,name");
  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Equipe" title="Atletas" />
      <Card>
        <form
          action={addTeamAthleteAction}
          className="grid gap-3 md:grid-cols-5"
        >
          <input type="hidden" name="teamId" value={id} />
          <select
            name="athleteId"
            aria-label="Atleta"
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
            aria-label="Temporada"
            className="rounded-ur border bg-black p-3"
          >
            {seasons?.map((s) => (
              <option value={s.id} key={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            name="membershipType"
            aria-label="Papel"
            className="rounded-ur border bg-black p-3"
          >
            <option value="athlete">Atleta</option>
            <option value="captain">Capitão</option>
          </select>
          <input
            name="startsAt"
            type="datetime-local"
            aria-label="Início"
            required
            className="rounded-ur border bg-black p-3"
          />
          <Button type="submit">Adicionar</Button>
        </form>
      </Card>
      {d.memberships.map((m) => (
        <Card key={m.id}>
          <p>
            {d.directory.find((x) => x.athlete_id === m.athlete_id)
              ?.public_name ?? m.athlete_id}{" "}
            · {m.membership_type} · {m.status}
          </p>
          {m.status === "active" && (
            <form action={endMembershipAction}>
              <input type="hidden" name="membershipId" value={m.id} />
              <Button type="submit" variant="secondary">
                Encerrar vínculo
              </Button>
            </form>
          )}
        </Card>
      ))}
    </div>
  );
}
