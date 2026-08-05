import { Badge, Card, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { listMediaOperations } from "@/server/repositories/wallet-media-reports.repository";
import { Clapperboard, Sparkles, Tags } from "lucide-react";

export default async function AdminMediaPage() {
  const { assets, links, annotations, highlights, suggestions } =
    await listMediaOperations(await createClient());

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="MÃ­dia e vÃ­deo"
        title="OperaÃ§Ã£o de assets"
        description="Metadados, vÃ­nculos de partida, highlights e sugestÃµes de anÃ¡lise. VÃ­deo bruto fica fora do Postgres."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Assets"
          value={String(assets.length)}
          hint="Master, proxy, fotos e highlights"
          icon={Clapperboard}
        />
        <StatCard
          label="VÃ­nculos"
          value={String(links.length)}
          hint="MÃ­dia ligada a partidas"
          icon={Tags}
        />
        <StatCard
          label="SugestÃµes"
          value={String(suggestions.length)}
          hint="Manual/AI readiness"
          icon={Sparkles}
        />
      </div>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <h2 className="font-display text-xl font-black uppercase">Assets</h2>
          {assets.length ? (
            <div className="mt-4 grid gap-3">
              {assets.slice(0, 10).map((asset) => (
                <div key={asset.id} className="rounded-ur border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">
                        {asset.title ??
                          asset.external_url ??
                          asset.storage_path}
                      </p>
                      <p className="text-sm text-zinc-400">
                        {asset.asset_type} â€¢{" "}
                        {asset.athletes?.public_name ??
                          asset.teams?.name ??
                          asset.venues?.name ??
                          "OperaÃ§Ã£o UR"}
                      </p>
                    </div>
                    <Badge>{asset.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Sem assets"
              description="Registre URLs externas ou paths de storage privado quando a operaÃ§Ã£o de mÃ­dia iniciar."
            />
          )}
        </Card>

        <Card>
          <h2 className="font-display text-xl font-black uppercase">
            Highlights e anÃ¡lises
          </h2>
          <div className="mt-4 grid gap-3">
            {[...highlights, ...annotations, ...suggestions]
              .slice(0, 10)
              .map((item) => (
                <div key={`${item.id}`} className="rounded-ur border p-4">
                  <p className="font-bold">
                    {"title" in item
                      ? item.title
                      : "suggestion_type" in item
                        ? item.suggestion_type
                        : item.label}
                  </p>
                  <p className="text-sm text-zinc-400">
                    {"status" in item ? String(item.status) : "annotation"}
                  </p>
                </div>
              ))}
            {!highlights.length &&
              !annotations.length &&
              !suggestions.length && (
                <EmptyState
                  title="Sem marcaÃ§Ãµes"
                  description="AI suggestions nunca alimentam ranking sem revisÃ£o e aprovaÃ§Ã£o."
                />
              )}
          </div>
        </Card>
      </section>
    </div>
  );
}
