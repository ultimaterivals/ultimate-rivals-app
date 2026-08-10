import { CalendarDays, Camera, ImageIcon, MapPin, Sparkles } from "lucide-react";
import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";
import { createClient } from "@/lib/supabase/server";
import { getAthleteDashboard } from "@/server/services/athlete-experience.service";

function first<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export default async function AthleteArenasPage() {
  const viewer = await requireAthleteViewer();
  const client = await createClient();
  const data = await getAthleteDashboard(
    client,
    viewer.isMirror ? viewer.athleteId : viewer.identity.userId,
    viewer.isMirror ? "athlete" : "profile",
  );

  const next = data?.nextRegistration?.session ?? null;
  const pole = data?.pole ?? null;

  const { data: nextSession, error: nextSessionError } = next?.id
    ? await client
        .from("ur_play_sessions")
        .select("id,name,starts_at,venue_id,venues(id,name,address_line,city,state)")
        .eq("id", next.id)
        .maybeSingle()
    : { data: null, error: null };
  if (nextSessionError) throw nextSessionError;

  const venue = first(nextSession?.venues);
  const { data: venueMedia, error: venueMediaError } = venue?.id
    ? await client
        .from("media_assets")
        .select("id,title,description,external_url,asset_type,status,created_at")
        .eq("venue_id", venue.id)
        .eq("asset_type", "photo")
        .in("status", ["publishable", "public"])
        .not("external_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(6)
    : { data: [], error: null };
  if (venueMediaError) throw venueMediaError;

  const photos = venueMedia ?? [];
  const cover = photos[0] ?? null;
  const gallery = photos.slice(1, 4);

  return (
    <div className="mx-auto grid max-w-7xl gap-7">
      <PageHeader
        eyebrow="Arenas UR"
        title="Onde a temporada acontece"
        description="Arenas, agenda e imagens publicadas pela operação formam o mapa físico da sua temporada. Conteúdo privado nunca entra nesta experiência."
      />

      <section className="overflow-hidden rounded-ur border border-ur-gold/40 bg-black/30">
        {cover?.external_url ? (
          <div
            role="img"
            aria-label={cover.title ?? `Arena ${venue?.name ?? "Ultimate Rivals"}`}
            className="relative min-h-80 border-b border-white/10 bg-cover bg-center sm:min-h-[28rem]"
            style={{ backgroundImage: `linear-gradient(to top, rgba(0,0,0,.82), rgba(0,0,0,.08)), url(${cover.external_url})` }}
          >
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
              <p className="text-xs font-black tracking-[.22em] text-ur-gold uppercase">
                Capa oficial publicada
              </p>
              {cover.title && <p className="mt-1 text-sm font-bold text-white">{cover.title}</p>}
            </div>
          </div>
        ) : (
          <div className="relative flex min-h-80 items-center justify-center border-b border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-6 sm:min-h-[28rem]">
            <div className="text-center">
              <span className="mx-auto flex size-20 items-center justify-center rounded-full border border-ur-gold/30 bg-ur-gold/10">
                <ImageIcon className="text-ur-gold" size={38} />
              </span>
              <p className="mt-5 text-xs font-black tracking-[.22em] text-zinc-500 uppercase">
                Arena sem foto pública
              </p>
              <p className="mx-auto mt-2 max-w-lg text-sm text-zinc-500">
                Quando a operação publicar uma fotografia vinculada a esta arena, ela aparecerá aqui automaticamente.
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {venue ? <Badge>Próxima arena</Badge> : <Badge>Polo principal</Badge>}
              {(venue?.city ?? pole?.city) && <Badge>{venue?.city ?? pole?.city}</Badge>}
              {venue?.state && <Badge>{venue.state}</Badge>}
            </div>
            <h2 className="font-display mt-3 text-3xl font-black uppercase sm:text-5xl">
              {venue?.name ?? pole?.name ?? "Arena a definir"}
            </h2>
            <p className="mt-2 max-w-2xl text-zinc-400">
              {venue
                ? `${nextSession?.name ?? "Próxima atividade"}${venue.address_line ? ` · ${venue.address_line}` : ""}`
                : pole
                  ? `Seu polo oficial é ${pole.name}. A próxima arena aparece assim que houver uma atividade confirmada.`
                  : "Seu polo e sua próxima arena ainda serão definidos pela operação."}
            </p>
          </div>
          <Link
            href="/athlete/agenda"
            className="bg-ur-gold text-ur-black rounded-ur inline-flex min-h-12 items-center justify-center px-5 font-black"
          >
            Ver agenda da temporada
          </Link>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <Card className="border-ur-gold/30">
          <MapPin className="text-ur-gold" size={28} />
          <p className="mt-4 text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
            Próximo destino
          </p>
          <h2 className="font-display mt-2 text-3xl font-black uppercase">
            {venue?.name ?? "Nenhuma arena agendada"}
          </h2>
          {venue ? (
            <>
              <p className="mt-3 text-sm text-zinc-400">
                {nextSession?.starts_at
                  ? new Date(nextSession.starts_at).toLocaleString("pt-BR", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Horário a definir"}
                {` · ${venue.city}/${venue.state}`}
              </p>
              <Link href="/athlete/agenda" className="text-ur-gold mt-5 inline-flex font-black">
                Abrir atividade →
              </Link>
            </>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">
              Explore a agenda para encontrar a próxima oportunidade disponível.
            </p>
          )}
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
                Galeria oficial
              </p>
              <h2 className="font-display mt-1 text-2xl font-black uppercase">
                Conheça o palco antes de jogar
              </h2>
            </div>
            <Camera className="text-ur-gold" />
          </div>

          {gallery.length ? (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {gallery.map((photo) => (
                <div
                  key={photo.id}
                  role="img"
                  aria-label={photo.title ?? "Foto pública da arena"}
                  className="min-h-36 rounded-ur border border-white/10 bg-cover bg-center"
                  style={{ backgroundImage: `url(${photo.external_url})` }}
                />
              ))}
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {["Quadras", "Estrutura", "Atmosfera"].map((label) => (
                <div
                  key={label}
                  className="flex min-h-32 items-center justify-center rounded-ur border border-dashed border-white/10 bg-black/20 p-3 text-center"
                >
                  <div>
                    <ImageIcon className="mx-auto text-zinc-700" size={24} />
                    <span className="mt-2 block text-xs font-black text-zinc-600 uppercase">
                      {label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="mt-4 text-xs text-zinc-600">
            {photos.length
              ? `${photos.length} fotografia(s) pública(s) vinculada(s) à arena.`
              : "Nenhum ativo público vinculado à arena neste momento."}
          </p>
        </Card>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <Card>
          <CalendarDays className="text-ur-gold" />
          <h2 className="mt-3 text-xl font-black">Próximos eventos</h2>
          <p className="mt-2 text-sm text-zinc-400">
            UR Play, treinos, Series, Cup, Legends e demais atividades continuam vindo do calendário oficial.
          </p>
          <Link href="/athlete/agenda" className="mt-4 inline-flex font-black">
            Abrir calendário
          </Link>
        </Card>
        <Card>
          <Sparkles className="text-ur-gold" />
          <h2 className="mt-3 text-xl font-black">Acontecimentos da arena</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Destaques publicados continuam formando a memória esportiva da temporada e das arenas.
          </p>
          <Link href="/athlete/highlights" className="mt-4 inline-flex font-black">
            Ver destaques
          </Link>
        </Card>
        <Card>
          <MapPin className="text-ur-gold" />
          <h2 className="mt-3 text-xl font-black">Polo da temporada</h2>
          {pole ? (
            <p className="mt-2 text-sm text-zinc-400">
              Sua identidade territorial está vinculada a {pole.name}, {pole.city}. As arenas são os locais físicos onde essa jornada acontece.
            </p>
          ) : (
            <EmptyState
              title="Polo ainda não definido"
              description="A operação precisa definir o vínculo oficial antes de personalizar esta área."
            />
          )}
        </Card>
      </section>
    </div>
  );
}
