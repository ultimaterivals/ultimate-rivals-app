import { CalendarDays, Camera, ImageIcon, MapPin, Sparkles } from "lucide-react";
import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";
import { createClient } from "@/lib/supabase/server";
import { getAthleteDashboard } from "@/server/services/athlete-experience.service";

export default async function AthleteArenasPage() {
  const viewer = await requireAthleteViewer();
  const data = await getAthleteDashboard(
    await createClient(),
    viewer.isMirror ? viewer.athleteId : viewer.identity.userId,
    viewer.isMirror ? "athlete" : "profile",
  );

  const next = data?.nextRegistration?.session ?? null;
  const pole = data?.pole ?? null;

  return (
    <div className="mx-auto grid max-w-7xl gap-7">
      <PageHeader
        eyebrow="Arenas UR"
        title="Onde a temporada acontece"
        description="Cada arena pode se tornar um lugar reconhecível do universo UR: identidade, fotos, agenda, estrutura e acontecimentos, sempre derivados de conteúdo publicado pela operação."
      />

      <section className="overflow-hidden rounded-ur border border-ur-gold/40 bg-black/30">
        <div className="relative flex min-h-80 items-center justify-center border-b border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-6 sm:min-h-[28rem]">
          <div className="text-center">
            <span className="mx-auto flex size-20 items-center justify-center rounded-full border border-ur-gold/30 bg-ur-gold/10">
              <ImageIcon className="text-ur-gold" size={38} />
            </span>
            <p className="mt-5 text-xs font-black tracking-[.22em] text-zinc-500 uppercase">
              capa oficial da arena
            </p>
            <p className="mx-auto mt-2 max-w-lg text-sm text-zinc-500">
              Slot preparado para fotografia pública da arena. Até existir mídia publicada, nenhum arquivo privado ou improvisado é exibido.
            </p>
          </div>
        </div>
        <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge>Arena principal</Badge>
              {pole?.city && <Badge>{pole.city}</Badge>}
            </div>
            <h2 className="font-display mt-3 text-3xl font-black uppercase sm:text-5xl">
              {pole?.name ?? "Arena a definir"}
            </h2>
            <p className="mt-2 max-w-2xl text-zinc-400">
              {pole
                ? "Seu polo principal conecta identidade territorial, calendário e disputa dentro da temporada."
                : "Seu polo principal ainda não está definido pela operação."}
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
            {next?.name ?? "Nenhuma arena agendada"}
          </h2>
          {next ? (
            <>
              <p className="mt-3 text-sm text-zinc-400">
                Sua próxima atividade aparece aqui porque está conectada à agenda oficial do atleta.
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
          <p className="mt-4 text-xs text-zinc-600">
            Os slots permanecem vazios enquanto não houver ativos públicos associados à arena.
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
            Espaço preparado para destaques, mídia e narrativas territoriais quando a operação publicar conteúdo elegível.
          </p>
          <Link href="/athlete/highlights" className="mt-4 inline-flex font-black">
            Ver destaques
          </Link>
        </Card>
        <Card>
          <MapPin className="text-ur-gold" />
          <h2 className="mt-3 text-xl font-black">Universo de arenas</h2>
          {pole ? (
            <p className="mt-2 text-sm text-zinc-400">
              Sua identidade atual está vinculada a {pole.name}. Novas arenas podem entrar pela mesma base operacional, sem criar cadastro paralelo.
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
