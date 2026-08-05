import { Badge, Card, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { listMarketAdmin } from "@/server/repositories/partner-market.repository";
import { Gift, Package, Ticket } from "lucide-react";

function brl(value: number | string | null | undefined) {
  return Number(value ?? 0).toLocaleString("pt-BR", {
    currency: "BRL",
    style: "currency",
  });
}

export default async function AdminMarketPage() {
  const { partners, items, offers, redemptions } = await listMarketAdmin(
    await createClient(),
  );

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="UR Market"
        title="Market MVP"
        description="Parceiros, itens, ofertas BRL/URC configuráveis e redemptions privadas por atleta."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Parceiros"
          value={String(partners.length)}
          hint="Categorias Q1"
          icon={Package}
        />
        <StatCard
          label="Ofertas"
          value={String(offers.length)}
          hint="Funciona sem UR Coins"
          icon={Gift}
        />
        <StatCard
          label="Redemptions"
          value={String(redemptions.length)}
          hint="Privadas por atleta"
          icon={Ticket}
        />
      </div>

      <Card>
        <h2 className="font-display text-xl font-black uppercase">Ofertas</h2>
        {offers.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {offers.map((offer) => (
              <div key={offer.id} className="rounded-ur border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{offer.name}</p>
                    <p className="text-sm text-zinc-400">
                      {offer.market_items?.name}
                    </p>
                  </div>
                  <Badge>{offer.status}</Badge>
                </div>
                <p className="mt-3 text-sm">
                  {offer.accepts_brl ? brl(offer.brl_amount) : "sem BRL"}
                  {offer.accepts_urc ? ` + ${offer.urc_amount} URC` : ""}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Sem ofertas"
            description="O Market pode operar em BRL mesmo sem UR Coins."
          />
        )}
      </Card>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <h2 className="font-display text-xl font-black uppercase">Itens</h2>
          <div className="mt-4 grid gap-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-ur border p-4">
                <p className="font-bold">{item.name}</p>
                <p className="text-sm text-zinc-400">
                  {item.category} • {item.item_type}
                </p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="font-display text-xl font-black uppercase">
            Redemptions
          </h2>
          {redemptions.length ? (
            <div className="mt-4 grid gap-3">
              {redemptions.map((redemption) => (
                <div key={redemption.id} className="rounded-ur border p-4">
                  <p className="font-bold">{redemption.market_offers?.name}</p>
                  <p className="text-sm text-zinc-400">
                    {redemption.athletes?.public_name} • {redemption.status}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Sem redemptions"
              description="Resgates aparecem aqui quando atletas usam ofertas."
            />
          )}
        </Card>
      </section>
    </div>
  );
}
