import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Coins, Gift, ShoppingBag, Sparkles, Tag } from "lucide-react";
import Link from "next/link";
import { Badge, Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { listPublicMarketOffers } from "@/server/repositories/partner-market.repository";
import { getAthleteDashboard } from "@/server/services/athlete-experience.service";

function brl(value: number | string | null | undefined) {
  return Number(value ?? 0).toLocaleString("pt-BR", {
    currency: "BRL",
    style: "currency",
  });
}

function marketErrorCode(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("insufficient ur coins")) return "insufficient_balance";
  if (normalized.includes("inventory exhausted")) return "inventory_exhausted";
  if (normalized.includes("redemption limit")) return "limit_reached";
  if (normalized.includes("not active")) return "offer_inactive";
  if (normalized.includes("not redeemable")) return "urc_unavailable";
  return "redemption_failed";
}

const marketErrorMessage: Record<string, string> = {
  insufficient_balance: "Seu saldo de UR Coins não é suficiente para este resgate.",
  inventory_exhausted: "Esta oferta acabou de esgotar.",
  limit_reached: "Você atingiu o limite de resgates desta oferta.",
  offer_inactive: "Esta oferta não está mais disponível.",
  urc_unavailable: "Esta oferta não aceita resgate com UR Coins.",
  redemption_failed: "Não foi possível concluir o resgate. Tente novamente.",
};

async function redeemMarketOfferUrc(formData: FormData) {
  "use server";

  await requireRole("athlete");
  const offerId = String(formData.get("offerId") ?? "");
  const operationId = String(formData.get("operationId") ?? "");

  if (!offerId || !operationId) {
    redirect("/athlete/market?marketError=redemption_failed");
  }

  const { error } = await (await createClient()).rpc("redeem_market_offer_urc", {
    target_offer: offerId,
    operation_id: operationId,
  });

  if (error) {
    redirect(`/athlete/market?marketError=${marketErrorCode(error.message)}`);
  }

  revalidatePath("/athlete");
  revalidatePath("/athlete/market");
  revalidatePath("/athlete/wallet");
  revalidatePath("/admin/market");
  revalidatePath("/admin/studio");
  redirect("/athlete/market?redeemed=1");
}

export default async function AthleteMarketPage({
  searchParams,
}: {
  searchParams: Promise<{ redeemed?: string; marketError?: string }>;
}) {
  const viewer = await requireAthleteViewer();
  const query = await searchParams;
  const client = await createClient();
  const [offers, dashboard] = await Promise.all([
    listPublicMarketOffers(client),
    getAthleteDashboard(client, viewer.athleteId, "athlete"),
  ]);
  const balance = dashboard?.wallet.projection?.balance ?? 0;

  return (
    <div className="mx-auto grid max-w-7xl gap-7">
      <PageHeader
        eyebrow="UR Market"
        title="Transforme participação em utilidade"
        description="Produtos, benefícios e experiências publicados para o atleta. Pontos de ranking e UR Coins continuam economias separadas."
      />

      {query.redeemed === "1" && (
        <Card className="border-emerald-500/40 bg-emerald-500/5">
          <strong className="text-emerald-300">Resgate reservado com sucesso.</strong>
          <p className="mt-1 text-sm text-zinc-400">
            O débito já aparece na Wallet e a operação acompanha o status pelo UR Market.
          </p>
        </Card>
      )}

      {query.marketError && (
        <Card className="border-red-500/40 bg-red-500/5">
          <strong className="text-red-300">Resgate não concluído.</strong>
          <p className="mt-1 text-sm text-zinc-400">
            {marketErrorMessage[query.marketError] ?? marketErrorMessage.redemption_failed}
          </p>
        </Card>
      )}

      <section className="ranking-hero border-ur-gold/40 rounded-ur overflow-hidden border p-5 sm:p-7">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-ur-gold">
              <ShoppingBag size={22} />
              <span className="text-xs font-black tracking-[.2em] uppercase">
                Loja do ecossistema
              </span>
            </div>
            <h2 className="font-display mt-3 max-w-3xl text-3xl font-black uppercase sm:text-5xl">
              Jogue. Evolua. Resgate.
            </h2>
            <p className="mt-3 max-w-2xl text-zinc-400">
              O Market fecha o ciclo da temporada: sua atividade gera uma economia própria que pode ser usada em ofertas realmente publicadas pela operação e parceiros.
            </p>
          </div>
          <div className="rounded-ur border border-ur-gold/30 bg-black/30 p-5 lg:min-w-64">
            <p className="text-xs font-black tracking-[.16em] text-zinc-500 uppercase">
              Seu saldo
            </p>
            <div className="mt-2 flex items-end justify-between gap-4">
              <div>
                <strong className="font-display text-5xl text-ur-gold">
                  {balance}
                </strong>
                <span className="ml-2 font-black">URC</span>
              </div>
              <Coins className="text-ur-gold" size={30} />
            </div>
            <Link href="/athlete/wallet" className="mt-4 inline-flex font-black">
              Ver carteira →
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Card>
          <Gift className="text-ur-gold" />
          <strong className="mt-3 block text-lg">Recompensas</strong>
          <p className="mt-1 text-sm text-zinc-500">
            Produtos, serviços e experiências entram aqui somente quando publicados.
          </p>
        </Card>
        <Card>
          <Coins className="text-ur-gold" />
          <strong className="mt-3 block text-lg">UR Coins</strong>
          <p className="mt-1 text-sm text-zinc-500">
            O saldo exibido vem do ledger existente; esta página não concede moedas.
          </p>
        </Card>
        <Card>
          <Sparkles className="text-ur-gold" />
          <strong className="mt-3 block text-lg">Parceiros UR</strong>
          <p className="mt-1 text-sm text-zinc-500">
            Benefícios externos podem entrar no mesmo catálogo sem expor dados internos.
          </p>
        </Card>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
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
              const urcAmount = Number(offer.urc_amount ?? 0);
              const canAfford = offer.accepts_urc && urcAmount > 0 && urcAmount <= balance;
              return (
                <Card key={offer.id} className="group overflow-hidden p-0">
                  <div className="flex min-h-40 items-center justify-center border-b border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-5">
                    <div className="text-center">
                      <ShoppingBag className="text-ur-gold mx-auto transition-transform group-hover:scale-110" size={34} />
                      <p className="mt-3 text-[.65rem] font-black tracking-[.18em] text-zinc-600 uppercase">
                        espaço de imagem do produto
                      </p>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge>{offer.category}</Badge>
                      <span className="flex items-center gap-1 text-xs font-bold text-zinc-500">
                        <Tag size={13} /> {offer.item_type}
                      </span>
                    </div>
                    <h3 className="font-display mt-4 text-2xl font-black uppercase">
                      {offer.name}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-400">
                      {offer.partner_name ?? "Ultimate Rivals"}
                    </p>
                    <div className="mt-6 border-t border-white/10 pt-4">
                      <p className="text-xs font-black tracking-[.16em] text-zinc-600 uppercase">
                        Valor
                      </p>
                      <p className="font-display mt-1 text-2xl font-black text-ur-gold">
                        {offer.accepts_urc ? `${offer.urc_amount} URC` : ""}
                        {offer.accepts_urc && offer.accepts_brl ? " · " : ""}
                        {offer.accepts_brl ? brl(offer.brl_amount) : ""}
                      </p>
                      {offer.accepts_urc && urcAmount > balance ? (
                        <p className="mt-2 text-xs font-bold text-zinc-500">
                          Faltam {Math.max(0, urcAmount - balance)} URC para este resgate.
                        </p>
                      ) : offer.accepts_urc ? (
                        <p className="mt-2 text-xs font-bold text-emerald-400">
                          Seu saldo atual cobre esta oferta em URC.
                        </p>
                      ) : null}

                      {viewer.isMirror ? (
                        <p className="mt-4 rounded-ur border border-white/10 p-3 text-xs font-bold text-zinc-500">
                          Prévia read-only: resgates ficam desabilitados para o administrador.
                        </p>
                      ) : offer.accepts_urc ? (
                        <form action={redeemMarketOfferUrc} className="mt-4">
                          <input type="hidden" name="offerId" value={offer.id} />
                          <input type="hidden" name="operationId" value={randomUUID()} />
                          <Button type="submit" className="w-full" disabled={!canAfford}>
                            {canAfford ? "Resgatar com UR Coins" : "Saldo insuficiente"}
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="Sem ofertas ativas"
            description="Quando o Market tiver ofertas públicas, elas aparecerão aqui. Nenhum produto fictício é criado para preencher o catálogo."
          />
        )}
      </section>
    </div>
  );
}
