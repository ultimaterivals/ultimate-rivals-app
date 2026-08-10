import {
  Clapperboard,
  ExternalLink,
  Play,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getAthletePortalSnapshot } from "@/server/services/athlete-portal-service";

export default async function AthleteHighlightsPage() {
  const user = await requireRole(["athlete"]);
  const snapshot = await getAthletePortalSnapshot({ userId: user.userId });

  if (!snapshot.identity) {
    return (
      <EmptyState
        title="Perfil esportivo ainda não vinculado"
        description="Os destaques aparecem após o vínculo oficial do atleta."
      />
    );
  }

  const client = await createClient();
  const { data, error } = await client
    .from("highlight_clips")
    .select("id,title,status,updated_at,media_assets(title,external_url)")
    .eq("athlete_id", snapshot.identity.id)
    .in("status", ["publishable", "public"])
    .order("updated_at", { ascending: false })
    .limit(18);

  if (error) throw error;

  const clips = data ?? [];
  const featured = clips[0] ?? null;
  const rest = clips.slice(1);
  const featuredAsset = featured
    ? Array.isArray(featured.media_assets)
      ? featured.media_assets[0]
      : featured.media_assets
    : null;

  return (
    <div className="mx-auto grid max-w-7xl gap-7">
      <PageHeader
        eyebrow="Destaques"
        title="Sua história dentro do UR"
        description="Jogadas e momentos publicados pela operação. Conteúdo privado não entra na experiência do atleta."
      />

      {featured ? (
        <section className="rounded-ur border-ur-gold/40 grid overflow-hidden border bg-black/30 lg:grid-cols-[1.25fr_.75fr]">
          <div className="flex min-h-72 items-center justify-center border-b border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-6 lg:border-r lg:border-b-0">
            <span className="border-ur-gold/30 bg-ur-gold/10 flex size-20 items-center justify-center rounded-full border">
              <Play className="text-ur-gold" size={34} />
            </span>
          </div>
          <div className="flex flex-col justify-end p-6 sm:p-8">
            <div className="flex gap-2">
              <Badge>Destaque principal</Badge>
              <Badge>{featured.status}</Badge>
            </div>
            <h2 className="font-display mt-5 text-3xl font-black uppercase sm:text-4xl">
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
            ) : null}
          </div>
        </section>
      ) : (
        <Card className="ranking-hero border-ur-gold/40">
          <Clapperboard className="text-ur-gold" size={30} />
          <h2 className="font-display mt-4 text-3xl font-black uppercase">
            Sua temporada também vira história
          </h2>
          <p className="mt-3 text-zinc-400">
            Quando a operação publicar um momento elegível, ele aparecerá aqui
            automaticamente.
          </p>
        </Card>
      )}

      <section className="grid gap-3 sm:grid-cols-3">
        <Card>
          <Trophy className="text-ur-gold" />
          <strong className="font-display mt-3 block text-4xl">
            {clips.length}
          </strong>
          <p className="text-sm text-zinc-500">momentos publicados</p>
        </Card>
        <Card>
          <Clapperboard className="text-ur-gold" />
          <strong className="mt-3 block text-lg">Narrativa da temporada</strong>
          <p className="mt-1 text-sm text-zinc-500">
            Mídia acompanha a carreira sem alterar ranking.
          </p>
        </Card>
        <Card>
          <Sparkles className="text-ur-gold" />
          <strong className="mt-3 block text-lg">Publicação controlada</strong>
          <p className="mt-1 text-sm text-zinc-500">
            Apenas conteúdo elegível é exibido.
          </p>
        </Card>
      </section>

      {rest.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rest.map((clip) => {
            const asset = Array.isArray(clip.media_assets)
              ? clip.media_assets[0]
              : clip.media_assets;
            return (
              <Card key={clip.id}>
                <Play className="text-ur-gold" />
                <h3 className="mt-4 text-xl font-black">{clip.title}</h3>
                <p className="mt-2 text-sm text-zinc-400">
                  {asset?.title ?? "Destaque Ultimate Rivals"}
                </p>
                {asset?.external_url ? (
                  <a
                    className="text-ur-gold mt-4 inline-flex items-center gap-2 font-black"
                    href={asset.external_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Assistir <ExternalLink size={14} />
                  </a>
                ) : null}
              </Card>
            );
          })}
        </div>
      ) : !featured ? (
        <EmptyState
          title="Nenhum destaque publicado ainda"
          description="A tela já está conectada ao catálogo oficial de destaques."
        />
      ) : null}
    </div>
  );
}
