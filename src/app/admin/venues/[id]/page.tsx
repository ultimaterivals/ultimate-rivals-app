import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { getVenuePartnerDetail } from "@/server/repositories/partner-market.repository";

export default async function AdminVenueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { venue, partnerships, availability, rates, rules, events } =
    await getVenuePartnerDetail(await createClient(), id);

  if (!venue) {
    return (
      <EmptyState
        title="Venue não encontrada"
        description="A venue solicitada não existe ou não está visível para seu papel."
      />
    );
  }

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow={venue.pole_name}
        title={venue.venue_name}
        description="Detalhe operacional da quadra parceira: disponibilidade, rates, regras comerciais, eventos e relatório."
      />

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <h2 className="font-display text-xl font-black uppercase">
            Parceria
          </h2>
          {partnerships.length ? (
            <div className="mt-4 grid gap-3">
              {partnerships.map((item) => (
                <div key={item.id} className="rounded-ur border p-4">
                  <Badge>{item.status}</Badge>
                  <p className="mt-2 font-bold">{item.billing_model}</p>
                  <p className="text-sm text-zinc-400">
                    Rate: {item.hourly_rate ?? "—"} • share:{" "}
                    {item.revenue_share_percent ?? "—"}%
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Sem parceria configurada"
              description="O cadastro oficial da venue existe; parceria comercial ainda não foi registrada."
            />
          )}
        </Card>

        <Card>
          <h2 className="font-display text-xl font-black uppercase">
            Eventos vinculados
          </h2>
          <div className="mt-4 grid gap-3">
            {events.map((event) => (
              <div key={event.id} className="rounded-ur border p-4">
                <p className="font-bold">{event.name}</p>
                <p className="text-sm text-zinc-400">
                  {event.event_type} • {event.status} • ranking oficial:{" "}
                  {event.official_ranking_event ? "sim" : "não"}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <MiniList title="Disponibilidade" rows={availability} />
        <MiniList title="Rates" rows={rates} />
        <MiniList title="Regras comerciais" rows={rules} />
      </section>
    </div>
  );
}

function MiniList({ title, rows }: { title: string; rows: { id: string }[] }) {
  return (
    <Card>
      <h2 className="font-display text-lg font-black uppercase">{title}</h2>
      <p className="font-display mt-3 text-3xl font-black">{rows.length}</p>
      <p className="text-sm text-zinc-400">registros visíveis</p>
    </Card>
  );
}
