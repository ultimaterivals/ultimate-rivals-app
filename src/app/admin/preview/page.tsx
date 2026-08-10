import { Eye, Search, ShieldCheck } from "lucide-react";
import { Button, Card, PageHeader } from "@/components/ui";
import { startAthleteMirrorAction } from "@/features/admin-athlete-mirror/actions";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { searchAthletes } from "@/server/repositories/athlete360.repository";

export default async function AdminAthleteMirrorPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; invalid?: string }>;
}) {
  await requireRole("admin");
  const query = await searchParams;
  const { rows, count } = await searchAthletes(await createClient(), {
    query: query.q,
    page: 1,
    pageSize: 50,
    sort: "name",
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Prévia do Atleta"
        title="Ver como atleta"
        description="Selecione um atleta e abra a experiência real da temporada em modo somente leitura. Sua sessão continua sendo administrativa."
      />
      <Card className="border-ur-gold/40">
        <div className="flex items-start gap-3">
          <ShieldCheck className="text-ur-gold mt-1" />
          <div>
            <h2 className="font-display text-xl font-black uppercase">Prévia segura</h2>
            <p className="mt-1 text-sm text-zinc-400">Sem troca de sessão, sem senha do atleta, sem service role no navegador e sem gravação por controles da experiência espelhada.</p>
          </div>
        </div>
      </Card>
      {query.invalid === "1" && (
        <p role="alert" className="rounded-ur border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">Atleta inválido ou indisponível para a prévia.</p>
      )}
      <Card>
        <form className="flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="mirror-search">Buscar atleta</label>
          <div className="relative flex-1">
            <Search className="absolute top-3.5 left-3 text-zinc-600" size={18} />
            <input id="mirror-search" name="q" defaultValue={query.q} placeholder="Nome ou código do atleta" className="rounded-ur min-h-12 w-full border bg-black pr-4 pl-10" />
          </div>
          <Button type="submit">Buscar</Button>
        </form>
        <p className="mt-3 text-xs text-zinc-500">{count} atleta(s) encontrado(s).</p>
      </Card>
      <div className="grid gap-3">
        {rows.map((athlete) => (
          <Card key={athlete.id} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-ur-gold text-xs font-black tracking-[.18em] uppercase">{athlete.athlete_code}</p>
              <h2 className="mt-1 text-xl font-black">{athlete.public_name}</h2>
              <p className="text-sm text-zinc-500">{athlete.status} · {athlete.profile_id ? "conta vinculada" : "sem conta"}</p>
            </div>
            <form action={startAthleteMirrorAction}>
              <input type="hidden" name="athleteId" value={athlete.id} />
              <Button type="submit"><Eye size={17} /> Abrir prévia</Button>
            </form>
          </Card>
        ))}
      </div>
    </div>
  );
}
