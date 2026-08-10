import { ArrowRight, CalendarDays, MapPin, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Badge, Card, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { getAthletePortalSnapshot } from "@/server/services/athlete-portal-service";

export default async function AthleteArenasPage() {
  const user = await requireRole(["athlete"]);
  const snapshot = await getAthletePortalSnapshot({ userId: user.userId });
  const next = snapshot.nextReservation;
  const opportunities = (snapshot.opportunities ?? [])
    .filter((item) => item.venueName || item.poleName)
    .slice(0, 6);

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <PageHeader
        eyebrow="Arenas UR"
        title="Onde o jogo acontece"
        description="Quadras e locais aparecem para você a partir da operação oficial e das oportunidades abertas."
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
          opportunities.map((opportunity) => (
            <Card key={opportunity.id} className="overflow-hidden">
              <div className="flex min-h-32 items-center justify-center rounded-ur border border-dashed border-white/10 bg-black/20">
                <MapPin className="text-ur-gold" size={32} aria-hidden="true" />
              </div>
              <p className="text-ur-gold mt-4 text-xs font-black tracking-[.16em] uppercase">
                {opportunity.poleName ?? "Polo UR"}
              </p>
              <h2 className="mt-1 text-xl font-black">
                {opportunity.venueName ?? "Local a definir"}
              </h2>
              <p className="mt-2 text-sm text-zinc-400">{opportunity.title}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {opportunity.level && <Badge>{opportunity.level}</Badge>}
                {opportunity.formatCode && <Badge>{opportunity.formatCode}</Badge>}
              </div>
            </Card>
          ))
        ) : (
          <Card className="lg:col-span-3">
            <MapPin className="text-ur-gold" aria-hidden="true" />
            <h2 className="mt-3 text-xl font-black">Nenhuma arena publicada para você</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Assim que houver uma oportunidade elegível com local oficial, ela aparecerá aqui.
            </p>
          </Card>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card>
          <ShieldCheck className="text-ur-gold" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-black">Locais oficiais</h2>
          <p className="mt-2 text-sm text-zinc-400">
            O App não cria arenas paralelas: ele reflete locais e polos homologados pela operação.
          </p>
        </Card>
        <Card>
          <CalendarDays className="text-ur-gold" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-black">Encontre onde jogar</h2>
          <p className="mt-2 text-sm text-zinc-400">
            A agenda conecta disponibilidade, demanda, reserva e a arena real da atividade.
          </p>
          <Link href="/athlete/agenda" className="text-ur-gold mt-5 inline-flex items-center gap-1 font-black">
            Abrir agenda <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </Card>
      </section>
    </div>
  );
}
