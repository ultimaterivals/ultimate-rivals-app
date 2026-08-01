import { Button, Card, PageHeader } from "@/components/ui";
import { transitionSeasonAction } from "@/features/progression/actions";
import { createClient } from "@/lib/supabase/server";
import { getSeasonDetail } from "@/server/repositories/progression.repository";
const next: Record<string, string> = {
  draft: "registration",
  registration: "active",
  active: "closing",
  closing: "closed",
  closed: "archived",
};
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params,
    d = await getSeasonDetail(await createClient(), id);
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow={d.season.status}
        title={d.season.name}
        description="Temporada competitiva trimestral"
      />
      {next[d.season.status] && (
        <form action={transitionSeasonAction}>
          <input name="seasonId" type="hidden" value={id} />
          <input name="status" type="hidden" value={next[d.season.status]} />
          <Button>Avançar para {next[d.season.status]}</Button>
        </form>
      )}
      <div className="grid gap-4 md:grid-cols-4">
        {Object.entries(d.distribution).map(([k, v]) => (
          <Card key={k}>
            <p className="text-zinc-500 uppercase">{k}</p>
            <strong className="text-3xl">{v}</strong>
          </Card>
        ))}
      </div>
      <Card>
        <h2 className="text-xl font-black">Ciclos mensais</h2>
        {d.cycles.map((c) => (
          <p key={c.id}>
            {c.cycle_number}. {c.name} · {c.status}
          </p>
        ))}
      </Card>
      <Card>
        <h2 className="text-xl font-black">Operação</h2>
        <p>
          {d.processes.length} processos de nivelamento ·{" "}
          {d.pendingReviews.length} revisões pendentes
        </p>
      </Card>
    </div>
  );
}
