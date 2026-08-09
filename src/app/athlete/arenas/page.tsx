import { CalendarDays, ImageIcon, MapPin } from "lucide-react";
import Link from "next/link";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getAthleteDashboard } from "@/server/services/athlete-experience.service";

export default async function AthleteArenasPage() {
  const identity = await requireRole("athlete");
  const data = await getAthleteDashboard(await createClient(), identity.userId);

  const next = data?.nextRegistration?.session ?? null;
  const pole = data?.pole ?? null;

  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      <PageHeader
        eyebrow="Arenas UR"
        title="Onde a temporada acontece"
        description="Arenas, polos e espaços oficiais ganham identidade própria dentro da jornada do atleta. Fotos e conteúdos aparecem apenas quando publicados pela operação."
      />

      <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <Card className="border-ur-gold/40 overflow-hidden p-0">
          <div className="flex min-h-72 items-center justify-center border-b border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-6 text-center">
            <div>
              <ImageIcon className="text-ur-gold mx-auto" size={40} />
              <p className="mt-4 text-xs font-black tracking-[.2em] text-zinc-500 uppercase">
                Foto oficial da arena
              </p>
              <p className="mt-2 max-w-md text-sm text-zinc-400">
                Este espaço está preparado para capa, galeria e mídia publicada pela operação, sem expor arquivos privados.
              </p>
            </div>
          </div>
          <div className="p-6">
            <p className="text-ur-gold text-xs font-black tracking-[.18em] uppercase">
              Arena principal
            </p>
            <h2 className="font-display mt-2 text-3xl font-black uppercase">
              {pole?.name ?? "Arena a definir"}
            </h2>
            <p className="mt-2 text-zinc-400">
              {pole?.city ? `${pole.city} · Polo oficial Ultimate Rivals` : "Seu polo principal ainda não está definido."}
            </p>
          </div>
        </Card>

        <Card>
          <MapPin className="text-ur-gold" size={28} />
          <h2 className="mt-4 text-2xl font-black">Próxima arena</h2>
          {next ? (
            <div className="mt-4 grid gap-3">
              <strong className="text-xl">{next.name}</strong>
              <p className="text-sm text-zinc-400">
                Sua próxima atividade confirmada aparece aqui conectada à agenda oficial.
              </p>
              <Link href="/athlete/agenda" className="mt-2 inline-flex font-black text-ur-gold">
                Ver na agenda →
              </Link>
            </div>
          ) : (
            <EmptyState
              title="Nenhuma arena agendada"
              description="Quando houver uma reserva ou atividade futura, ela aparecerá aqui."
              action={
                <Link href="/athlete/agenda" className="font-black text-ur-gold">
                  Explorar agenda
                </Link>
              }
            />
          )}
        </Card>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <Card>
          <ImageIcon className="text-ur-gold" />
          <h2 className="mt-3 text-xl font-black">Galeria</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Área reservada para fotos oficiais, ambiente, quadras, estrutura e bastidores publicados pela operação.
          </p>
        </Card>
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
          <MapPin className="text-ur-gold" />
          <h2 className="mt-3 text-xl font-black">Universo UR</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Esta superfície está pronta para receber novas arenas sem criar regra esportiva ou motor paralelo.
          </p>
        </Card>
      </section>
    </div>
  );
}
