import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { listPublicMarketOffers } from "@/server/repositories/partner-market.repository";

function brl(value: number | string | null | undefined) {
  return Number(value ?? 0).toLocaleString("pt-BR", {
    currency: "BRL",
    style: "currency",
  });
}

export default async function AthleteMarketPage() {
  const offers = await listPublicMarketOffers(await createClient());

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="UR Market"
        title="Benefícios e ofertas"
        description="Ofertas disponíveis sem expor estoque interno, pagamentos, wallet ou redemptions de outros atletas."
      />

      {offers.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {offers.map((offer) => (
            <Card key={offer.id}>
              <Badge>{offer.category}</Badge>
              <h2 className="font-display mt-3 text-xl font-black uppercase">
                {offer.name}
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                {offer.partner_name ?? "Ultimate Rivals"} • {offer.item_type}
              </p>
              <p className="font-display mt-5 text-2xl font-black">
                {offer.accepts_brl ? brl(offer.brl_amount) : ""}
                {offer.accepts_urc ? ` ${offer.urc_amount} URC` : ""}
              </p>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Sem ofertas ativas"
          description="Quando o Market tiver ofertas públicas, elas aparecerão aqui."
        />
      )}
    </div>
  );
}
