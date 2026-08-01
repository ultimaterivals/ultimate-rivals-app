import { Button, Card, PageHeader } from "@/components/ui";
import { createTeam360Action } from "@/features/teams/actions";
import { createClient } from "@/lib/supabase/server";
import { listPoles } from "@/server/repositories/poles.repository";

export default async function Page() {
  const poles = await listPoles(await createClient());
  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Novo clube" title="Criar equipe" />
      <Card>
        <form
          action={createTeam360Action}
          className="grid gap-4 md:grid-cols-2"
        >
          <input
            name="name"
            required
            placeholder="Nome"
            className="rounded-ur border bg-black p-3"
          />
          <input
            name="slug"
            required
            pattern="[a-z0-9][a-z0-9-]+"
            placeholder="slug-da-equipe"
            className="rounded-ur border bg-black p-3"
          />
          <input
            name="shortName"
            placeholder="Nome curto"
            className="rounded-ur border bg-black p-3"
          />
          <select
            name="primaryPoleId"
            required
            className="rounded-ur border bg-black p-3"
          >
            <option value="">Polo oficial</option>
            {poles.map((p) => (
              <option value={p.id} key={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            name="foundedAt"
            type="date"
            className="rounded-ur border bg-black p-3"
          />
          <input
            name="instagramHandle"
            placeholder="@instagram"
            className="rounded-ur border bg-black p-3"
          />
          <textarea
            name="description"
            placeholder="Identidade esportiva"
            className="rounded-ur min-h-28 border bg-black p-3 md:col-span-2"
          />
          <Button type="submit">Criar equipe</Button>
        </form>
      </Card>
    </div>
  );
}
