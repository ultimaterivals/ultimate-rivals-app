import { Button, Card, PageHeader } from "@/components/ui";
import { updateTeamAction } from "@/features/teams/actions";
import { createClient } from "@/lib/supabase/server";
import { getTeamDetail } from "@/server/repositories/team360.repository";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params,
    d = await getTeamDetail(await createClient(), id);
  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Identidade" title={`Editar ${d.team.name}`} />
      <Card>
        <form action={updateTeamAction} className="grid gap-4 md:grid-cols-2">
          <input name="teamId" type="hidden" value={id} />
          <input
            name="name"
            required
            defaultValue={d.team.name}
            className="rounded-ur border bg-black p-3"
          />
          <input
            name="slug"
            required
            defaultValue={d.team.slug}
            className="rounded-ur border bg-black p-3"
          />
          <input
            name="shortName"
            defaultValue={d.team.short_name ?? ""}
            className="rounded-ur border bg-black p-3"
          />
          <input
            name="foundedAt"
            type="date"
            defaultValue={d.team.founded_at ?? ""}
            className="rounded-ur border bg-black p-3"
          />
          <input
            name="instagramHandle"
            defaultValue={d.team.instagram_handle ?? ""}
            className="rounded-ur border bg-black p-3"
          />
          <textarea
            name="description"
            defaultValue={d.team.description ?? ""}
            className="rounded-ur min-h-28 border bg-black p-3 md:col-span-2"
          />
          <Button type="submit">Salvar</Button>
        </form>
      </Card>
    </div>
  );
}
