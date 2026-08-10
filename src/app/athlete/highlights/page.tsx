import { Clapperboard, ExternalLink, Play, Sparkles, Trophy } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";
import { createClient } from "@/lib/supabase/server";

export default async function AthleteHighlightsPage() {
  const viewer = await requireAthleteViewer();
  const client = await createClient();
  const athleteId = viewer.athleteId;

  const { data: clips, error } = await client
    .from("highlight_clips")
    .select(
      "id,title,status,starts_at_ms,ends_at_ms,updated_at,media_assets(title,asset_type,external_url)",
    )
    .eq("athlete_id", athleteId)
    .in("status", ["publishable", "public"])
    .order("updated_at", { ascending: false })
    .limit(18);

  if (error) throw error;

  const published = clips ?? [];
  const featured = published[0] ?? null;
  const rest = published.slice(1);
  const featuredAsset = featured
    ? Array.isArray(featured.media_assets)
      ? featured.media_assets[0]
      : featured.media_assets
    : null;

  return (
    <div className="mx-auto grid max-w-7xl gap-7">
      <PageHeader
        eyebrow="Destaques da temporada"
        title="Sua história dentro do UR"
        description="Jogadas, clipes e momentos publicados pela operação. Apenas conteúdo elegível aparece aqui; mídia privada permanece fora da experiência do atleta."
      />

      {featured ? (
        <section className="grid overflow-hidden rounded-ur border border-ur-gold/40 bg-black/30 lg:grid-cols-[1.25fr_.75fr]">
          <div className="relative flex min-h-72 items-center justify-center border-b border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-6 lg:min-h-[26rem] lg:border-r lg:border-b-0">
            <div className="text-center">
              <span className="mx-auto flex size-20 items-center justify-center rounded-full border border-ur-gold/30 bg-ur-gold/10">
                <Play className="text-ur-gold" size={34} />
              </span>
              <p className="mt-4 text-xs font-black tracking-[.2em] text-zinc-600 uppercase">
                mídia publicada em destaque
              </p>
            </div>
          </div>
          <div className="flex flex-col justify-end p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>Destaque principal</Badge>
              <Badge>{featured.status}</Badge>
            </div>
            <p className="mt-5 text-xs font-black tracking-[.18em] text-ur-gold uppercase">
              Último momento publicado
            </p>
            <h2 className="font-display mt-2 text-3xl font-black uppercase sm:text-4xl">
              {featured.title}
            </h2>
            <p className="mt-3 text-zinc-400">
              {featuredAsset?.title ?? "Destaque Ultimate Rivals"}
            </p>
            {featuredAsset?.external_url ? (
              <a
                className="bg-ur-gold text-ur-black rounded-ur mt-6 inline-flex min-h-12 items-center justify-center gap-2 px-5 font-black"
                href={featuredAsset.external_url}
                target="_blank"
                rel="noreferrer"
              >
                Assistir agora <ExternalLink size={16} />
              </a>
            ) : (
              <p className="mt-6 text-sm font-bold text-zinc-600">
                A operação publicou o destaque, mas ainda não há URL pública vinculada.
              </p>
            )}
          </div>
        </section>
      ) : (
        <section className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
          <Card className="ranking-hero border-ur-gold/40">
            <Clapperboard className="text-ur-gold" size={30} />
            <h2 className="font-display mt-4 text-3xl font-black uppercase sm:text-4xl">
              Sua temporada também vira história
            </h2>
            <p className="mt-3 max-w-2xl text-zinc-400">
              Resultados contam a competição. Destaques contam a narrativa. Quando um momento for publicado, ele assume o centro desta tela.
            </p>
          </Card>
          <Card>
            <Sparkles className="text-ur-gold" size={28} />
            <p className="mt-4 text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
              Destaques publicados
            </p>
            <strong className="font-display mt-2 block text-5xl">0</strong>
          </Card>
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-3">
        <Card>
          <Trophy className="text-ur-gold" />
          <strong className="font-display mt-3 block text-4xl">
            {published.length}
          </strong>
          <p className="text-sm text-zinc-500">momentos publicados</p>
        </Card>
        <Card>
          <Clapperboard className="text-ur-gold" />
          <strong className="mt-3 block text-lg">Narrativa da temporada</strong>
          <p className="mt-1 text-sm text-zinc-500">
            A mídia acompanha a carreira esportiva sem alterar ranking ou desempenho.
          </p>
        </Card>
        <Card>
          <Sparkles className="text-ur-gold" />
          <strong className="mt-3 block text-lg">Publicação controlada</strong>
          <p className="mt-1 text-sm text-zinc-500">
            Apenas estados publishable/public entram nesta experiência.
          </p>
        </Card>
      </section>

      {rest.length ? (
        <section>
          <div className="mb-4">
            <p className="text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
              Arquivo da temporada
            </p>
            <h2 className="font-display text-2xl font-black uppercase">
              Mais momentos
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rest.map((clip) => {
              const asset = Array.isArray(clip.media_assets)
                ? clip.media_assets[0]
                : clip.media_assets;
              return (
                <Card key={clip.id} className="group flex min-h-72 flex-col overflow-hidden p-0">
                  <div className="flex min-h-36 items-center justify-center border-b border-white/10 bg-black/30">
                    <span className="flex size-14 items-center justify-center rounded-full border border-white/10 bg-black/40 transition-transform group-hover:scale-105">
                      <Play className="text-ur-gold" size={24} />
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <Trophy className="text-ur-gold shrink-0" size={20} />
                      <Badge>{clip.status}</Badge>
                    </div>
                    <h3 className="mt-4 text-xl font-black">{clip.title}</h3>
                    <p className="mt-2 text-sm text-zinc-400">
                      {asset?.title ?? "Destaque Ultimate Rivals"}
                    </p>
                    {asset?.external_url ? (
                      <a
                        className="text-ur-gold mt-auto inline-flex items-center gap-2 pt-5 font-black"
                        href={asset.external_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Assistir destaque <ExternalLink size={14} />
                      </a>
                    ) : (
                      <p className="mt-auto pt-5 text-sm text-zinc-600">
                        Mídia ainda sem URL pública.
                      </p>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      ) : !featured ? (
        <EmptyState
          title="Nenhum destaque publicado ainda"
          description="Quando a operação publicar uma jogada ou momento elegível, ele aparecerá aqui automaticamente."
        />
      ) : null}
    </div>
  );
}
