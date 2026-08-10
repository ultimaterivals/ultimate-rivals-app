import { notFound } from "next/navigation";
import { Card, PageHeader, Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import {
  getAthleteHistory,
  getAthletePrivateView,
} from "@/server/repositories/athlete360.repository";
import { getAthleteEngagement } from "@/server/repositories/demand.repository";
import {
  assignAthleteProfileAction,
  assignAthleteLevelAction,
  athleteStatusAction,
  createAthleteNoteAction,
} from "@/features/athletes/actions";
import Link from "next/link";
import { startAthleteMirrorAction } from "@/features/admin-athlete-mirror/actions";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await createClient();
  let athlete;
  try {
    athlete = await getAthletePrivateView(client, id);
  } catch {
    return notFound();
  }
  const [history, engagement] = await Promise.all([
    getAthleteHistory(client, id),
    getAthleteEngagement(client, id),
  ]);
  const { data: seasons } = await client
    .from("seasons")
    .select("id,name")
    .order("starts_at", { ascending: false });
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow={athlete.athlete_code}
        title={athlete.public_name}
        description={`${athlete.full_name} · ${athlete.status}`}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Link className="text-ur-gold" href={`/admin/athletes/${id}/edit`}>
          Editar dados permitidos
        </Link>
        <form action={startAthleteMirrorAction}>
          <input type="hidden" name="athleteId" value={id} />
          <Button type="submit">Abrir prévia</Button>
        </form>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <h2 className="font-bold">Dados pessoais</h2>
          <p>{athlete.email_contact ?? "Sem e-mail"}</p>
          <p>{athlete.phone ?? "Sem telefone"}</p>
          <p>
            {athlete.city ?? "—"} {athlete.state ?? ""}
          </p>
        </Card>
        <Card>
          <h2 className="font-bold">Conta vinculada</h2>
          <p>{athlete.profile_id ?? "Atleta sem conta"}</p>
          {!athlete.profile_id && (
            <form
              action={assignAthleteProfileAction}
              className="mt-3 grid gap-2"
            >
              <input type="hidden" name="athleteId" value={id} />
              <input
                className="rounded-ur border bg-black p-2"
                name="profileId"
                aria-label="Profile ID"
                placeholder="UUID de profile existente"
                required
              />
              <Button type="submit">Associar conta</Button>
            </form>
          )}
        </Card>
        <Card>
          <h2 className="font-bold">Status</h2>
          <form action={athleteStatusAction}>
            <input type="hidden" name="athleteId" value={id} />
            <input
              type="hidden"
              name="operation"
              value={athlete.status === "archived" ? "restore" : "archive"}
            />
            <Button type="submit">
              {athlete.status === "archived" ? "Reativar" : "Arquivar"}
            </Button>
          </form>
        </Card>
      </div>
      <Card>
        <h2 className="mb-4 text-xl font-bold">Atribuir nível</h2>
        <form
          action={assignAthleteLevelAction}
          className="grid gap-3 md:grid-cols-4"
        >
          <input type="hidden" name="athleteId" value={id} />
          <select
            name="seasonId"
            aria-label="Temporada"
            required
            className="rounded-ur border bg-black p-3"
          >
            {seasons?.map((s) => (
              <option value={s.id} key={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            name="level"
            aria-label="Nível"
            className="rounded-ur border bg-black p-3"
          >
            <option value="leveling">Em nivelamento</option>
            <option value="n3">N3</option>
            <option value="n2">N2</option>
            <option value="n1">N1</option>
          </select>
          <input
            name="startsAt"
            type="datetime-local"
            aria-label="Início"
            required
            className="rounded-ur border bg-black p-3"
          />
          <Button type="submit">Atribuir</Button>
        </form>
        <div className="mt-5 grid gap-2">
          {history.levels.map((l) => (
            <p key={l.id} className="border-ur-gold border-l-2 pl-4">
              <strong>{l.level}</strong> ·{" "}
              {new Date(l.starts_at).toLocaleDateString("pt-BR")}{" "}
              {l.ends_at
                ? `→ ${new Date(l.ends_at).toLocaleDateString("pt-BR")}`
                : "→ atual"}
            </p>
          ))}
        </div>
      </Card>
      <Card>
        <h2 className="mb-4 text-xl font-bold">Histórico de equipe</h2>
        {history.memberships.map((m) => (
          <p key={m.id}>
            {Array.isArray(m.teams) ? m.teams[0]?.name : "—"} ·{" "}
            {Array.isArray(m.seasons) ? m.seasons[0]?.name : "—"} · {m.status}
          </p>
        ))}
      </Card>
      <Card>
        <h2 className="mb-4 text-xl font-bold">Observações</h2>
        <h3 className="mb-4 text-lg font-bold">Engagement privado</h3>
        <div className="mb-6 grid gap-3 md:grid-cols-4">
          <PrivateMetric label="Source" value={engagement?.source ?? "—"} />
          <PrivateMetric
            label="Signup"
            value={formatDate(engagement?.signup_at)}
          />
          <PrivateMetric
            label="Last activity"
            value={formatDate(engagement?.last_activity_at)}
          />
          <PrivateMetric
            label="Last participation"
            value={formatDate(engagement?.last_participation_at)}
          />
          <PrivateMetric
            label="First interest"
            value={formatDate(engagement?.first_interest_at)}
          />
          <PrivateMetric
            label="First booking"
            value={formatDate(engagement?.first_booking_at)}
          />
          <PrivateMetric
            label="30d participations"
            value={String(engagement?.participations_30d ?? 0)}
          />
          <PrivateMetric
            label="Days since last"
            value={String(engagement?.days_since_last_participation ?? "—")}
          />
        </div>
        <p className="mb-6 text-xs text-zinc-500">
          Dados de aquisição, retenção e analytics são privados do admin e não
          entram no perfil público.
        </p>
        <form action={createAthleteNoteAction} className="grid gap-3">
          <input type="hidden" name="athleteId" value={id} />
          <select
            name="noteType"
            aria-label="Tipo"
            className="rounded-ur border bg-black p-3"
          >
            <option value="general">Geral</option>
            <option value="operational">Operacional</option>
            <option value="technical">Técnica</option>
          </select>
          <select
            name="visibility"
            aria-label="Visibilidade"
            className="rounded-ur border bg-black p-3"
          >
            <option value="internal">Interna</option>
            <option value="athlete_visible">Visível ao atleta</option>
          </select>
          <textarea
            name="content"
            aria-label="Observação"
            required
            className="rounded-ur border bg-black p-3"
          />
          <Button type="submit">Registrar nota</Button>
        </form>
        {history.notes.map((n) => (
          <p key={n.id} className="mt-3 border-t pt-3">
            {n.content} <small>· {n.visibility}</small>
          </p>
        ))}
      </Card>
    </div>
  );
}

function PrivateMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-ur border border-zinc-800 p-3">
      <p className="text-xs text-zinc-500 uppercase">{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString("pt-BR") : "—";
}
