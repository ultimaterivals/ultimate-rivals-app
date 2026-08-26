import { ArrowRight, CalendarDays, MapPin, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge, Card, PageHeader } from "@/components/ui";
import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";
import { createClient } from "@/lib/supabase/server";
import { getAthleteSnapshotForViewer } from "@/server/services/athlete-viewer-snapshot-service";

function safeExternalUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export default async function AthleteArenasPage() {
  const viewer = await requireAthleteViewer();
  const snapshot = await getAthleteSnapshotForViewer(viewer);
  const next = snapshot.nextReservation;
  const opportunities = (snapshot.opportunities ?? [])
    .filter((item) => item.venueName || item.poleName)
    .slice(0, 6);

  const venueNames = [
    ...new Set(
      opportunities
        .map((item) => item.venueName)
        .filter((name): name is string => Boolean(name)),
    ),
  ];
  const arenaMedia = new Map<string, { url: string; title: string | null }>();

  if (venueNames.length > 0) {
    const client = await createClient();
    const venuesResult = await client
      .from("venues")
      .select("id,name")
      .in("name", venueNames);

    const venues = venuesResult.error ? [] : (venuesResult.data ?? []);
    const venueIds = venues.map((venue) => venue.id);

    if (venueIds.length > 0) {
      const sessionsResult = await client
        .from("ur_play_sessions")
        .select("id,venue_id")
        .in("venue_id", venueIds)
        .order("starts_at", { ascending: false })
        .limit(200);
      const sessions = sessionsResult.error ? [] : (sessionsResult.data ?? []);
      const sessionIds = sessions.map((session) => session.id);

      if (sessionIds.length > 0) {
        const mediaResult = await client
          .from("media_assets")
          .select("id,ur_play_session_id,title,external_url,status,updated_at")
          .in("ur_play_session_id", sessionIds)
          .in("status", ["publishable", "public"])
          .not("external_url", "is", null)
          .order("updated_at", { ascending: false })
          .limit(200);
        const assets = mediaResult.error ? [] : (mediaResult.data ?? []);
        const venueNameById = new Map(
          venues.map((venue) => [venue.id, venue.name] as const),
        );
        const venueIdBySession = new Map(
          sessions.map((session) => [session.id, session.venue_id] as const),
        );

        for (const asset of assets) {
          const venueId = venueIdBySession.get(asset.ur_play_session_id);
          const venueName = venueId ? venueNameById.get(venueId) : null;
          const url = safeExternalUrl(asset.external_url);
          if (venueName && url && !arenaMedia.has(venueName)) {
            arenaMedia.set(venueName, { url, title: asset.title });
          }
        }
      }
    }
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <PageHeader
        eyebrow="Arenas UR"
        title="Onde o jogo acontece"
        description="Quadras e locais aparecem para você a partir da operação oficial e das oportunidades abertas. Mídia só é exibida quando estiver publicada para consumo externo."
      />

      <section className="ranking-hero border-ur-gold/40 rounded-ur border p-5 sm:p-7">
        <p className="text-ur-gold text-xs font-black tracking-[.22em] uppercase">
          Próxima arena
        </p>
        <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h2 className="font-display text-4xl font-black uppercase sm:text-5xl">
              {next?.venueName ?? next?.poleName ?? "Arena a definir"}
            </h2>
            <p className="mt-3 max-w-2xl text-zinc-400">
              {next
                ? `${next.title} · ${next.poleName ?? "Polo UR"}`
                : "Reserve uma atividade para ver aqui sua próxima arena confirmada."}
            </p>
          </div>
          {next?.personalReservationStatus && (
            <Badge>{next.personalReservationStatus}</Badge>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {opportunities.length > 0 ? (
          opportunities.map((opportunity) => {
            const media = opportunity.venueName
              ? arenaMedia.get(opportunity.venueName)
              : null;
            return (
              <Card
                key={opportunity.id}
                className="ur-card-lift overflow-hidden p-0"
              >
                {media ? (
                  <div
                    role="img"
                    aria-label={
                      media.title ??
                      `Mídia publicada de ${opportunity.venueName ?? "Arena UR"}`
                    }
                    className="min-h-44 border-b border-white/10 bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${JSON.stringify(media.url)})`,
                    }}
                  />
                ) : (
                  <div className="ur-arena-surface relative flex min-h-44 items-center justify-center overflow-hidden border-b border-white/10">
                    <Image
                      src="/brand/ur-monogram.svg"
                      alt=""
                      width={128}
                      height={128}
                      className="absolute size-28 object-contain opacity-[.08]"
                    />
                    <MapPin
                      className="text-ur-gold"
                      size={32}
                      aria-hidden="true"
                    />
                  </div>
                )}
                <div className="p-5">
                  <p className="text-ur-gold text-xs font-black tracking-[.16em] uppercase">
                    {opportunity.poleName ?? "Polo UR"}
                  </p>
                  <h2 className="mt-1 text-xl font-black">
                    {opportunity.venueName ?? "Local a definir"}
                  </h2>
                  <p className="mt-2 text-sm text-zinc-400">
                    {opportunity.title}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {opportunity.level && <Badge>{opportunity.level}</Badge>}
                    {opportunity.formatCode && (
                      <Badge>{opportunity.formatCode}</Badge>
                    )}
                    {media && <Badge>Mídia publicada</Badge>}
                  </div>
                  <details className="mt-5 border-t border-white/10 pt-4">
                    <summary className="text-ur-gold cursor-pointer text-sm font-black marker:text-zinc-600">
                      Explorar arena
                    </summary>
                    <div className="mt-3 grid gap-2 text-sm text-zinc-400">
                      <p>
                        Base oficial da atividade em{" "}
                        {opportunity.poleName ?? "Polo UR"}.
                      </p>
                      <p>
                        {[opportunity.level, opportunity.formatCode]
                          .filter(Boolean)
                          .join(" · ") || "Detalhes definidos pela operação"}
                      </p>
                      {media ? (
                        <a
                          href={media.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-ur-gold mt-1 font-black"
                        >
                          Abrir mídia publicada →
                        </a>
                      ) : null}
                    </div>
                  </details>
                </div>
              </Card>
            );
          })
        ) : (
          <Card className="lg:col-span-3">
            <MapPin className="text-ur-gold" aria-hidden="true" />
            <h2 className="mt-3 text-xl font-black">
              Nenhuma arena publicada para você
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Assim que houver uma oportunidade elegível com local oficial, ela
              aparecerá aqui.
            </p>
          </Card>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card>
          <ShieldCheck className="text-ur-gold" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-black">Locais oficiais</h2>
          <p className="mt-2 text-sm text-zinc-400">
            O App não cria arenas paralelas e não expõe caminhos de storage
            privado: reflete somente locais homologados e URLs externas
            elegíveis.
          </p>
        </Card>
        <Card>
          <CalendarDays className="text-ur-gold" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-black">Encontre onde jogar</h2>
          <p className="mt-2 text-sm text-zinc-400">
            A agenda conecta disponibilidade, demanda, reserva e a arena real da
            atividade.
          </p>
          <Link
            href="/athlete/agenda"
            className="text-ur-gold mt-5 inline-flex items-center gap-1 font-black"
          >
            Abrir agenda <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </Card>
      </section>
    </div>
  );
}
