import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { SeasonCreateForm } from "@/features/admin/create-forms";
import { createClient } from "@/lib/supabase/server";
import { listSeasons } from "@/server/repositories/seasons.repository";
export default async function Page() {
  const rows = await listSeasons(await createClient());
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Calendário trimestral"
        title="Temporadas"
        description="Inscrições, três ciclos mensais, operação e fechamento controlado."
      />
      <Card>
        <SeasonCreateForm />
      </Card>
      <div className="grid gap-4">
        {rows.map((s) => (
          <Card key={s.id}>
            <p className="text-ur-gold text-xs font-bold uppercase">
              {s.status}
            </p>
            <h2 className="text-2xl font-black">{s.name}</h2>
            <p className="text-zinc-400">
              {new Date(s.starts_at).toLocaleDateString("pt-BR")} →{" "}
              {new Date(s.ends_at).toLocaleDateString("pt-BR")}
            </p>
            <Link
              className="mt-3 inline-block font-bold"
              href={`/admin/seasons/${s.id}`}
            >
              Abrir temporada →
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
