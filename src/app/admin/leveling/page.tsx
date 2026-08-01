import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { listLeveling } from "@/server/repositories/progression.repository";
const name = (v: unknown) =>
  Array.isArray(v)
    ? (v[0] as { name?: string })?.name
    : (v as { name?: string } | null)?.name;
export default async function Page() {
  const rows = await listLeveling(await createClient());
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Comissão técnica"
        title="Nivelamento"
        description="Observações competitivas ainda serão alimentadas pelo UR Play. Nesta etapa, somente avaliações DEV/manuais."
      />
      {rows.map((r) => (
        <Card key={r.id}>
          <p className="text-ur-gold text-xs font-bold uppercase">{r.status}</p>
          <h2 className="text-xl font-black">{name(r.athletes)}</h2>
          <p>
            {r.completed_observations}/{r.required_observations} observações
          </p>
          <Link href={`/admin/leveling/${r.athlete_id}`} className="font-bold">
            Revisar jornada →
          </Link>
        </Card>
      ))}
    </div>
  );
}
