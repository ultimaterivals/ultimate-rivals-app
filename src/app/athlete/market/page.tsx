import { Coins, Gift, ShoppingBag, Sparkles } from "lucide-react";
import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";
import { createClient } from "@/lib/supabase/server";
import { getAthleteSnapshotForViewer } from "@/server/services/athlete-viewer-snapshot-service";

function brl(value: number | string | null | undefined) {
  return Number(value ?? 0).toLocaleString("pt-BR", {
    currency: "BRL",
    style: "currency",
  });
}

export default async function AthleteMarketPage() {
  const viewer = await requireAthleteViewer();
  const snapshot = await getAthleteSnapshotForViewer(viewer);

  if (!snapshot.identity) {
    return (
      <EmptyState
        title="Perfil esportivo ainda não vinculado"
        description="O Market é liberado dentro da experiência oficial do atleta."
      />
    );
  }

  const client = await createClient();
  const now = new Date().toISOString();
  const { data, error } = await client
    .from("market_offers")
    .select(
      "id,name,status,brl_amount,urc_amount,accepts_brl,accepts_urc,starts_at,ends_at,inventory_limit,per_athlete_limit",
    )
    .eq("status", "active")
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const offers = data ?? [];
  const balance = snapshot.summary?.urCoinBalance ?? 0;

  return (
    <div className="mx-auto grid max-w-7xl gap-7">
      <PageHeader
        eyebrow="UR Market"
        title="Jogue. Evolua. Resgate."
        description="Produtos, benefícios e experiências publicados para atletas. Ranking e UR Coins permanecem economias separadas."
      />

      <section className="ranking-hero border-ur-gold/40 rounded-ur overflow-hidden border p-5 sm:p-7">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="text-ur-gold flex items-center gap-2">
              <ShoppingBag size={22} />
              <span className="text-xs font-black tracking-[.2em] uppercase">
                Loja do ecossistema
              </span>
            </div>
            <h2 className="font-display mt-3 max-w-3xl text-3xl font-black uppercase sm:text-5xl">
              Sua participação ganha utilidade
            </h2>
            <p className="mt-3 max-w-2xl text-zinc-400">
              O catálogo abaixo vem das ofertas ativas do backend oficial.
              Nenhum produto fictício é criado para preencher a loja.
            </p>
          </div>
          <div className="rounded-ur border-ur-gold/30 border bg-black/30 p-5 lg:min-w-64">
            <p className="text-xs font-black tracking-[.16em] text-zinc-500 uppercase">
              Seu saldo
            </p>
            <strong className="font-display text-ur-gold mt-2 block text-5xl">
              {balance}
            </strong>
            <span className="font-black">URC</span>
            <Link href="/athlete/wallet" className="mt-4 block font-black">
              Ver carteira →
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Card>
          <Gift className="text-ur-gold" />
          <strong className="mt-3 block text-lg">Recompensas reais</strong>
          <p className="mt-1 text-sm text-zinc-500">
            Somente ofertas publicadas pela operação.
          </p>
        </Card>
        <Card>
          <Coins className="text-ur-gold" />
          <strong className="mt-3 block text-lg">UR Coins</strong>
          <p className="mt-1 text-sm text-zinc-500">
            O saldo vem do ledger oficial.
          </p>
        </Card>
        <Card>
          <Sparkles className="text-ur-gold" />
          <strong className="mt-3 block text-lg">Resgate seguro</strong>
          <p className="mt-1 text-sm text-zinc-500">
            A ação de resgate será habilitada somente pelo RPC transacional
            forward-only.
          </p>
        </Card>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
              Disponível agora
            </p>
            <h2 className="font-display text-2xl font-black uppercase">
              Ofertas publicadas
            </h2>
          </div>
          <Badge>{offers.length} oferta(s)</Badge>
        </div>
        {offers.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {offers.map((offer) => {
              const urc = Number(offer.urc_amount ?? 0);
              return (
                <Card key={offer.id} className="overflow-hidden">
                  <ShoppingBag className="text-ur-gold" size={30} />
                  <h3 className="font-display mt-4 text-2xl font-black uppercase">
                    {offer.name}
                  </h3>
                  <div className="mt-5 border-t border-white/10 pt-4">
                    <p className="text-xs font-black tracking-[.16em] text-zinc-600 uppercase">
                      Valor
                    </p>
                    <p className="font-display text-ur-gold mt-1 text-2xl font-black">
                      {offer.accepts_urc ? `${urc} URC` : ""}
                      {offer.accepts_urc && offer.accepts_brl ? " · " : ""}
                      {offer.accepts_brl ? brl(offer.brl_amount) : ""}
                    </p>
                    {offer.accepts_urc ? (
                      <p className="mt-2 text-xs font-bold text-zinc-500">
                        {urc <= balance
                          ? "Saldo suficiente para esta oferta."
                          : `Faltam ${Math.max(0, urc - balance)} URC.`}
                      </p>
                    ) : null}
                    <div className="rounded-ur mt-4 border border-white/10 p-3 text-xs font-bold text-zinc-500">
                      Resgate temporariamente somente leitura até o RPC
                      transacional ser reconciliado com a migration atual de
                      produção.
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="Sem ofertas ativas"
            description="Quando o Command publicar uma oferta válida, ela aparecerá aqui automaticamente."
          />
        )}
      </section>
    </div>
  );
}
