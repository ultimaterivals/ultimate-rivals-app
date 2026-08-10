import { Eye, Search, ShieldCheck } from "lucide-react";
import { Button, Card, PageHeader } from "@/components/ui";
import { startAthletePreviewAction } from "@/features/admin-athlete-preview/actions";
import { requireRole } from "@/lib/auth/session";
import { fetchAdminAthletesRepositoryData } from "@/server/repositories/admin-athletes-repository";

export default async function AdminAthletePreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; invalid?: string }>;
}) {
  await requireRole(["admin"]);
  const query = await searchParams;
  const data = await fetchAdminAthletesRepositoryData();
  const search = query.q?.trim().toLocaleLowerCase("pt-BR") ?? "";
  const athletes = (data.athletes ?? [])
    .filter((athlete) => {
      if (!search) return true;
      return (
        athlete.public_name.toLocaleLowerCase("pt-BR").includes(search) ||
        athlete.athlete_code.toLocaleLowerCase("pt-BR").includes(search)
      );
    })
    .slice(0, 50);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Prévia do Atleta"
        title="Validar o App como atleta"
        description="Abra a experiência real do atleta em modo somente leitura. A sessão continua administrativa e o C18 permanece intacto para o acesso real dos atletas."
      />

      <Card className="border-ur-gold/40">
        <div className="flex items-start gap-3">
          <ShieldCheck className="text-ur-gold mt-1" aria-hidden="true" />
          <div>
            <h2 className="font-display text-xl font-black uppercase">
              Prévia segura
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Sem troca de Auth, sem senha do atleta, sem service role no
              navegador e sem ações de escrita dentro da experiência
              visualizada.
            </p>
          </div>
        </div>
      </Card>

      {query.invalid === "1" && (
        <Card className="border-red-500/40">
          <p className="text-sm font-bold text-red-300">
            Atleta inválido ou indisponível para prévia.
          </p>
        </Card>
      )}

      <Card>
        <form className="flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="preview-search">
            Buscar atleta
          </label>
          <div className="relative flex-1">
            <Search
              className="absolute top-3.5 left-3 text-zinc-600"
              size={18}
              aria-hidden="true"
            />
            <input
              id="preview-search"
              name="q"
              defaultValue={query.q}
              placeholder="Nome ou código do atleta"
              className="rounded-ur min-h-12 w-full border bg-black pr-4 pl-10"
            />
          </div>
          <Button type="submit">Buscar</Button>
        </form>
        <p className="mt-3 text-xs text-zinc-500">
          {athletes.length} atleta(s) neste recorte.
        </p>
      </Card>

      <div className="grid gap-3">
        {athletes.map((athlete) => (
          <Card
            key={athlete.id}
            className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-ur-gold text-xs font-black tracking-[.18em] uppercase">
                {athlete.athlete_code}
              </p>
              <h2 className="mt-1 text-xl font-black">{athlete.public_name}</h2>
              <p className="text-sm text-zinc-500">{athlete.status}</p>
            </div>
            <form action={startAthletePreviewAction}>
              <input type="hidden" name="athleteId" value={athlete.id} />
              <Button type="submit">
                <Eye size={17} aria-hidden="true" /> Abrir prévia
              </Button>
            </form>
          </Card>
        ))}
      </div>
    </div>
  );
}
