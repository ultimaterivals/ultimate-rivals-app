import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { listVenuePartnerOperations } from "@/server/repositories/partner-market.repository";
import { CalendarClock, MapPin, Receipt } from "lucide-react";

function brl(value: number | string | null | undefined) {
  return Number(value ?? 0).toLocaleString("pt-BR", {
    currency: "BRL",
    style: "currency",
  });
}

export default async function AdminVenuesPage() {
  const { venues, partnerships, availability, rates } =
    await listVenuePartnerOperations(await createClient());

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Arenas e quadras parceiras"
        title="Arenas UR"
        description="Central operacional das arenas: cadastro oficial, polos, quadras, parceria, disponibilidade, rates, eventos e leitura financeira. A experiência visual do atleta pode evoluir sobre esta base sem criar um segundo cadastro."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Arenas"
          value={String(venues.length)}
          hint="Cadastro oficial reutilizado"
          icon={MapPin}
        />
        <StatCard
          label="Parcerias"
          value={String(partnerships.length)}
          hint="Relações operacionais ativas"
          icon={Receipt}
        />
        <StatCard
          label="Janelas"
          value={String(availability.length)}
          hint="Disponibilidade configurável"
          icon={CalendarClock}
        />
      </div>

      <Card className="border-ur-gold/30">
        <h2 className="font-display text-xl font-black uppercase">
          Identidade da arena
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-zinc-400">
          Esta camada passa a ser a origem operacional para capa, galeria, estrutura, eventos, patrocinadores locais e demais conteúdos públicos da arena. Até existir mídia publicada, nenhum arquivo privado é exposto ao atleta.
        </p>
      </Card>

      <Card>
        <h2 className="font-display text-xl font-black uppercase">
          Operação por arena
        </h2>
        {venues.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="text-xs tracking-wider text-zinc-500 uppercase">
                <tr>
                  <th className="py-2">Arena</th>
                  <th>Polo</th>
                  <th>Parceria</th>
                  <th>Quadras</th>
                  <th>Janelas</th>
                  <th>Eventos</th>
                  <th>Receita</th>
                  <th>Margem</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {venues.map((venue) => (
                  <tr key={venue.venue_id}>
                    <td className="py-3 font-bold">
                      <Link href={`/admin/venues/${venue.venue_id}`}>
                        {venue.venue_name}
                      </Link>
                    </td>
                    <td>{venue.pole_name}</td>
                    <td>
                      <Badge>
                        {venue.partnership_status ?? "sem parceria"}
                      </Badge>
                    </td>
                    <td>{venue.court_count}</td>
                    <td>{venue.available_windows}</td>
                    <td>{venue.active_events}</td>
                    <td>{brl(venue.verified_revenue)}</td>
                    <td>{brl(venue.verified_margin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Sem arenas"
            description="Cadastre venues em polos antes de configurar a experiência de arena."
          />
        )}
      </Card>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <h2 className="font-display text-xl font-black uppercase">Rates</h2>
          <div className="mt-4 grid gap-3">
            {rates.slice(0, 8).map((rate) => (
              <div key={rate.id} className="rounded-ur border p-4">
                <p className="font-bold">{rate.name}</p>
                <p className="text-sm text-zinc-400">
                  {rate.venues?.name} • {rate.billing_model} •{" "}
                  {brl(rate.amount)}
                </p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="font-display text-xl font-black uppercase">
            Disponibilidade
          </h2>
          <div className="mt-4 grid gap-3">
            {availability.slice(0, 8).map((slot) => (
              <div key={slot.id} className="rounded-ur border p-4">
                <p className="font-bold">{slot.venues?.name}</p>
                <p className="text-sm text-zinc-400">
                  Dia {slot.weekday} • {slot.starts_at}–{slot.ends_at} •{" "}
                  {slot.available_courts} quadra(s)
                </p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
