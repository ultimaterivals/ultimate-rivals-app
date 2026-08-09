import { Clapperboard, Play, Sparkles, Trophy } from "lucide-react";
import { redirect } from "next/navigation";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function AthleteHighlightsPage() {
  const identity = await requireRole("athlete");
  const client = await createClient();
  const { data: athlete } = await client
    .from("athletes")
    .select("id,public_name")
    .eq("profile_id", identity.userId)
    .maybeSingle();

  if (!athlete) redirect("/athlete");

  const { data: clips, error } = await client
    .from("highlight_clips")
    .select(
      "id,title,status,starts_at_ms,ends_at_ms,updated_at,media_assets(title,asset_type,external_url)",
    )
    .eq("athlete_id", athlete.id)
    .in("status", ["publishable", "public"])
    .order("updated_at", { ascending: false })
    .limit(18);

  if (error) throw error;

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <PageHeader
        eyebrow="Destaques da temporada"
        title="Minha mídia"
        description="Jogadas, clipes e momentos publicados pela operação. Apenas conteúdo elegível aparece aqui; mídia privada permanece fora da experiência do atleta."
      />

      <section className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <Card className="ranking-hero border-ur-gold/40">
          <Clapperboard className="text-ur-gold" size={30} />
          <h2 className="font-display mt-4 text-3xl font-black uppercase sm:text-4xl">
            Sua temporada também vira história
          </h2>
          <p className="mt-3 max-w-2xl text-zinc-400">
            Resultados contam a competição. Destaques contam a narrativa. Este espaço reúne somente momentos já publicados para o atleta.
          </p>
        </Card>

        <Card>
          <Sparkles className="text-ur-gold" size={28} />
          <p className="mt-4 text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
            Destaques publicados
          </p>
          <strong className="font-display mt-2 block text-5xl">
            {clips?.length ?? 0}
          </strong>
          <p className="mt-2 text-sm text-zinc-400">
            Nenhum conteúdo é criado automaticamente a partir de estatísticas.
          </p>
        </Card>
      </section>

      {clips?.length ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {clips.map((clip) => {
            const asset = Array.isArray(clip.media_assets)
              ? clip.media_assets[0]
              : clip.media_assets;
            return (
              <Card key={clip.id} className="flex min-h-64 flex-col overflow-hidden">
                <div className="rounded-ur flex min-h-28 items-center justify-center border border-white/10 bg-black/30">
                  <Play className="text-ur-gold" size={30} />
                </div>
                <div className="mt-4 flex items-start justify-between gap-3">
                  <Trophy className="text-ur-gold shrink-0" size={20} />
                  <Badge>{clip.status}</Badge>
                </div>
                <h2 className="mt-4 text-xl font-black">{clip.title}</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  {asset?.title ?? "Destaque Ultimate Rivals"}
                </p>
                {asset?.external_url ? (
                  <a
                    className="text-ur-gold mt-auto pt-5 font-black"
                    href={asset.external_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Assistir destaque →
                  </a>
                ) : (
                  <p className="mt-auto pt-5 text-sm text-zinc-600">
                    Mídia ainda sem URL pública.
                  </p>
                )}
              </Card>
            );
          })}
        </section>
      ) : (
        <EmptyState
          title="Nenhum destaque publicado ainda"
          description="Quando a operação publicar uma jogada ou momento elegível, ele aparecerá aqui automaticamente."
        />
      )}
    </div>
  );
}
