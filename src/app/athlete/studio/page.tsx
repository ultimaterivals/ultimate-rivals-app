import Link from "next/link";
import { Clapperboard, Sparkles, Trophy } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function AthleteStudioPage() {
  const identity = await requireRole("athlete");
  const client = await createClient();
  const { data: athlete, error: athleteError } = await client
    .from("athletes")
    .select("id")
    .eq("profile_id", identity.userId)
    .maybeSingle();
  if (athleteError) throw athleteError;

  const { data: clips, error: clipsError } = athlete
    ? await client
        .from("highlight_clips")
        .select("id,title,status,starts_at_ms,ends_at_ms,media_assets(title,asset_type,external_url)")
        .eq("athlete_id", athlete.id)
        .in("status", ["publishable", "public"])
        .order("updated_at", { ascending: false })
        .limit(12)
    : { data: [], error: null };
  if (clipsError) throw clipsError;

  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      <PageHeader
        eyebrow="UR Studio"
        title="Seus destaques"
        description="Sua central de momentos homologados. O Studio não altera ranking, pontos ou resultados oficiais."
      />
      <section className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <Card className="border-ur-gold/40">
          <Clapperboard className="text-ur-gold" size={28} />
          <h2 className="mt-4 font-display text-3xl font-black uppercase">
            Destaque sua temporada
          </h2>
          <p className="mt-3 max-w-xl text-zinc-400">
            Clips publicados pela operação aparecem aqui com contexto esportivo.
            Análises e mídia nunca criam pontuação automaticamente.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link className="bg-ur-gold text-ur-black rounded-ur px-5 py-3 font-black" href="/athlete/matches">
              Ver meus jogos
            </Link>
            <Link className="rounded-ur border px-5 py-3 font-black" href="/athlete/development">
              Ver missões
            </Link>
          </div>
        </Card>
        <Card>
          <Sparkles className="text-ur-gold" size={26} />
          <h2 className="mt-4 text-xl font-black">Em preparação</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Missões, conquistas e arenas entram apenas quando houver dados válidos e publicação operacional.
          </p>
          <Link className="mt-5 inline-flex font-black" href="/athlete/season">
            Explorar temporada →
          </Link>
        </Card>
      </section>

      {clips?.length ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {clips.map((clip) => {
            const asset = Array.isArray(clip.media_assets)
              ? clip.media_assets[0]
              : clip.media_assets;
            return (
              <Card key={clip.id} className="flex min-h-52 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <Trophy className="text-ur-gold" />
                  <Badge>{clip.status}</Badge>
                </div>
                <h2 className="mt-5 text-xl font-black">{clip.title}</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  {asset?.title ?? "Destaque Ultimate Rivals"}
                </p>
                {asset?.external_url && (
                  <a className="mt-auto pt-5 font-black" href={asset.external_url} target="_blank" rel="noreferrer">
                    Assistir destaque →
                  </a>
                )}
              </Card>
            );
          })}
        </section>
      ) : (
        <EmptyState
          title="Seu Studio está pronto"
          description="Quando a operação publicar um destaque elegível, ele aparecerá aqui sem expor mídia privada."
        />
      )}
    </div>
  );
}
