import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Clapperboard,
  Coins,
  CreditCard,
  ExternalLink,
  MapPin,
  Shield,
  Sparkles,
  Trophy,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AthleteOpportunityCard } from "@/components/athlete/athlete-opportunity-card";
import { AthleteSourceHealth } from "@/components/athlete/athlete-source-health";
import { Badge } from "@/components/ui";
import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";
import { createClient } from "@/lib/supabase/server";
import { getAthleteSnapshotForViewer } from "@/server/services/athlete-viewer-snapshot-service";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

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

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function movementLabel(movement: string | null | undefined) {
  if (movement === "up") return "Subindo";
  if (movement === "down") return "Em disputa";
  if (movement === "stable") return "Estável";
  return null;
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[.62rem] font-black tracking-[.16em] text-zinc-600 uppercase">
        {label}
      </p>
      <p
        className={`font-display mt-1 truncate text-2xl font-black sm:text-3xl ${accent ? "text-ur-gold" : "text-white"}`}
      >
        {value}
      </p>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  href,
  cta = "Ver mais",
}: {
  eyebrow: string;
  title: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="text-ur-gold text-[.64rem] font-black tracking-[.2em] uppercase">
          {eyebrow}
        </p>
        <h2 className="font-display mt-1 text-2xl font-black tracking-tight uppercase sm:text-3xl">
          {title}
        </h2>
      </div>
      {href ? (
        <Link
          href={href}
          className="text-ur-gold mb-1 inline-flex min-h-10 shrink-0 items-center gap-1 text-xs font-black"
        >
          {cta} <ChevronRight size={15} aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}

export default async function AthletePage() {
  const viewer = await requireAthleteViewer();
  const snapshot = await getAthleteSnapshotForViewer(viewer);

  if (!snapshot.identity) {
    return (
      <div className="mx-auto grid max-w-3xl gap-6 py-8">
        <section className="border-ur-gold/20 rounded-ur border bg-white/[.025] p-6 sm:p-8">
          <p className="text-ur-gold text-xs font-black tracking-[.2em] uppercase">
            Sua carreira UR
          </p>
          <h1 className="font-display mt-3 text-4xl font-black tracking-tight uppercase">
            Perfil esportivo ainda não vinculado
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
            Sua conta está autenticada, mas ainda não encontramos um registro de
            atleta ligado a ela. Nenhum dado esportivo será inventado enquanto o
            vínculo oficial não for concluído.
          </p>
        </section>
        <AthleteSourceHealth errors={snapshot.sourceErrors} />
      </div>
    );
  }

  const client = await createClient();
  const highlightResult = await client
    .from("highlight_clips")
    .select(
      "id,title,status,updated_at,media_assets!inner(title,external_url,status)",
    )
    .eq("athlete_id", snapshot.identity.id)
    .in("status", ["publishable", "public"])
    .in("media_assets.status", ["publishable", "public"])
    .not("media_assets.external_url", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1);

  const latestHighlight = highlightResult.error
    ? null
    : (highlightResult.data?.[0] ?? null);
  const latestHighlightAsset = latestHighlight
    ? Array.isArray(latestHighlight.media_assets)
      ? latestHighlight.media_assets[0]
      : latestHighlight.media_assets
    : null;
  const latestHighlightUrl = safeExternalUrl(
    latestHighlightAsset?.external_url,
  );

  const ranking = snapshot.primaryRanking;
  const summary = snapshot.summary;
  const nextReservation = snapshot.nextReservation;
  const nextOpportunities = (snapshot.opportunities ?? [])
    .filter((item) => item.id !== nextReservation?.id)
    .slice(0, 3);
  const team = snapshot.teams?.[0] ?? null;
  const movement = movementLabel(ranking?.movement);
  const location = [snapshot.identity.city, snapshot.identity.state]
    .filter(Boolean)
    .join("/");
  const economyReliable = snapshot.state === "ready" && summary !== null;
  const creditsKnown = snapshot.creditBalance !== null;

  const nextAction = nextReservation
    ? {
        eyebrow: "Seu próximo movimento",
        title: nextReservation.title,
        description: [nextReservation.poleName, nextReservation.venueName]
          .filter(Boolean)
          .join(" · "),
        href: "/athlete/agenda",
        cta: "Abrir atividade",
      }
    : nextOpportunities.length > 0
      ? {
          eyebrow: "Seu próximo movimento",
          title: "Escolha onde jogar agora",
          description: `${nextOpportunities.length} oportunidade${nextOpportunities.length > 1 ? "s" : ""} disponível${nextOpportunities.length > 1 ? "eis" : ""} na sua agenda UR.`,
          href: "/athlete/agenda",
          cta: "Explorar oportunidades",
        }
      : {
          eyebrow: "Seu próximo movimento",
          title: "Prepare sua próxima entrada em quadra",
          description:
            "A agenda ainda não apresenta uma oportunidade disponível para você. Mantenha sua disponibilidade atualizada.",
          href: "/athlete/disponibilidade",
          cta: "Atualizar disponibilidade",
        };

  return (
    <div className="mx-auto grid max-w-7xl gap-8 pb-6 sm:gap-10">
      <section className="relative -mx-4 overflow-hidden border-y border-white/5 bg-[radial-gradient(circle_at_85%_20%,rgba(234,179,8,.12),transparent_32%),linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,0))] px-4 py-7 sm:mx-0 sm:rounded-[2rem] sm:border sm:px-8 sm:py-9 lg:px-10">
        <div className="pointer-events-none absolute -top-24 -right-20 size-72 rounded-full border border-ur-gold/10" />
        <div className="pointer-events-none absolute top-12 -right-5 size-44 rounded-full border border-white/5" />

        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="min-w-0">
            <p className="text-ur-gold text-[.65rem] font-black tracking-[.24em] uppercase">
              Rumo ao estrelato
            </p>
            <div className="mt-4 flex items-center gap-4">
              <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-ur-gold/25 bg-black/50 sm:size-20">
                {snapshot.identity.avatarUrl ? (
                  <Image
                    src={snapshot.identity.avatarUrl}
                    alt={`Foto de ${snapshot.identity.publicName}`}
                    width={160}
                    height={160}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="font-display text-2xl font-black text-ur-gold sm:text-3xl">
                    {initials(snapshot.identity.publicName)}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <h1 className="font-display truncate text-4xl font-black tracking-tight uppercase sm:text-6xl">
                  {snapshot.identity.publicName}
                </h1>
                <p className="mt-1 truncate text-sm font-bold text-zinc-500">
                  {[snapshot.identity.athleteCode, summary?.level, location]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {team ? <Badge>Equipe · {team.name}</Badge> : null}
              {ranking?.categoryCode ? <Badge>{ranking.categoryCode}</Badge> : null}
              {ranking?.formatCode ? <Badge>{ranking.formatCode}</Badge> : null}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-5 lg:min-w-[28rem] lg:border-t-0 lg:border-l lg:pt-0 lg:pl-7">
            <Stat
              label="Ranking"
              value={ranking?.currentPosition ? `#${ranking.currentPosition}` : "—"}
              accent
            />
            <Stat
              label="Pontos"
              value={ranking ? ranking.totalPoints.toLocaleString("pt-BR") : "—"}
            />
            <Stat
              label="Jogos"
              value={summary ? summary.games.toLocaleString("pt-BR") : "—"}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.35fr_.65fr] lg:items-stretch">
        <div className="relative overflow-hidden rounded-[1.75rem] border border-ur-gold/25 bg-ur-gold/[.055] p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-8 -bottom-14 size-44 rounded-full bg-ur-gold/5 blur-2xl" />
          <p className="text-ur-gold text-[.65rem] font-black tracking-[.2em] uppercase">
            {nextAction.eyebrow}
          </p>
          <h2 className="font-display mt-2 max-w-3xl text-3xl font-black tracking-tight uppercase sm:text-4xl">
            {nextAction.title}
          </h2>
          {nextAction.description ? (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
              {nextAction.description}
            </p>
          ) : null}
          <Link
            href={nextAction.href}
            className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-ur-gold px-5 text-sm font-black text-black transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ur-gold"
          >
            {nextAction.cta} <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>

        <div className="rounded-[1.75rem] border border-white/8 bg-white/[.025] p-6">
          <p className="text-[.64rem] font-black tracking-[.18em] text-zinc-600 uppercase">
            Seu momento
          </p>
          <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-6">
            <Stat
              label="Vitórias"
              value={ranking ? ranking.wins.toLocaleString("pt-BR") : "—"}
            />
            <Stat
              label="Derrotas"
              value={ranking ? ranking.losses.toLocaleString("pt-BR") : "—"}
            />
            <Stat
              label="Aproveitamento"
              value={ranking ? `${ranking.winRate.toFixed(1)}%` : "—"}
              accent
            />
            <Stat label="Movimento" value={movement ?? "—"} />
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        <SectionHeading
          eyebrow="Competição"
          title="Seu ranking está vivo"
          href="/athlete/ranking"
          cta="Abrir ranking"
        />

        <div className="grid gap-4 overflow-hidden rounded-[1.75rem] border border-white/8 bg-white/[.018] p-5 sm:grid-cols-[auto_1fr] sm:items-end sm:p-7">
          <div>
            <p className="text-xs font-black tracking-[.16em] text-zinc-600 uppercase">
              Posição atual
            </p>
            <strong className="font-display mt-1 block text-7xl font-black tracking-tight sm:text-8xl">
              {ranking?.currentPosition ? `#${ranking.currentPosition}` : "—"}
            </strong>
            <p className="text-ur-gold mt-1 font-black">
              {ranking
                ? `${ranking.totalPoints.toLocaleString("pt-BR")} PTS`
                : "Ranking ainda não disponível"}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 border-t border-white/8 pt-5 sm:border-t-0 sm:pt-0 sm:text-right">
            <Stat
              label="Jogos"
              value={ranking ? `${ranking.gamesPlayed}` : "—"}
            />
            <Stat label="Vitórias" value={ranking ? `${ranking.wins}` : "—"} />
            <Stat label="Derrotas" value={ranking ? `${ranking.losses}` : "—"} />
          </div>
        </div>
      </section>

      {team ? (
        <section className="grid gap-4">
          <SectionHeading
            eyebrow="Equipe"
            title="Você compete por algo maior"
            href="/athlete/team"
            cta="Minha equipe"
          />
          <Link
            href="/athlete/team"
            className="group grid gap-4 rounded-[1.75rem] border border-white/8 bg-white/[.02] p-5 transition-colors hover:border-ur-gold/25 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-6"
          >
            <div className="grid size-14 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-black/40">
              {team.logoUrl ? (
                <Image
                  src={team.logoUrl}
                  alt={`Escudo ${team.name}`}
                  width={112}
                  height={112}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Shield className="text-ur-gold" size={26} aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-display truncate text-2xl font-black uppercase">
                {team.name}
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Sua equipe faz parte da sua trajetória competitiva UR.
              </p>
            </div>
            <ArrowRight
              className="text-ur-gold transition-transform group-hover:translate-x-1"
              size={21}
              aria-hidden="true"
            />
          </Link>
        </section>
      ) : null}

      {nextReservation ? (
        <section className="grid gap-4">
          <SectionHeading
            eyebrow="Agenda"
            title="Próximo compromisso"
            href="/athlete/agenda"
            cta="Ver agenda"
          />
          {creditsKnown ? (
            <AthleteOpportunityCard
              opportunity={nextReservation}
              availableCredits={snapshot.creditBalance ?? 0}
              readOnly={viewer.isPreview}
            />
          ) : (
            <div className="rounded-[1.5rem] border border-white/8 bg-white/[.02] p-5">
              <p className="font-black">{nextReservation.title}</p>
              <p className="mt-2 text-sm text-zinc-500">
                {[nextReservation.poleName, nextReservation.venueName]
                  .filter(Boolean)
                  .join(" · ") || "Local a confirmar"}
              </p>
              <p className="mt-3 text-xs leading-5 text-zinc-600">
                Os créditos estão temporariamente indisponíveis. A atividade é
                exibida sem assumir saldo ou disponibilidade financeira.
              </p>
            </div>
          )}
        </section>
      ) : null}

      {nextOpportunities.length > 0 ? (
        <section className="grid gap-4">
          <SectionHeading
            eyebrow="Jogar"
            title="Oportunidades abertas"
            href="/athlete/agenda"
            cta="Ver todas"
          />
          <div className="grid gap-4 lg:grid-cols-3">
            {nextOpportunities.map((opportunity) =>
              creditsKnown ? (
                <AthleteOpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  availableCredits={snapshot.creditBalance ?? 0}
                  readOnly={viewer.isPreview}
                />
              ) : (
                <Link
                  key={opportunity.id}
                  href="/athlete/agenda"
                  className="rounded-[1.5rem] border border-white/8 bg-white/[.02] p-5 transition-colors hover:border-ur-gold/25"
                >
                  <p className="font-black">{opportunity.title}</p>
                  <p className="mt-2 text-sm text-zinc-500">
                    {[opportunity.categoryCode, opportunity.level, opportunity.formatCode]
                      .filter(Boolean)
                      .join(" · ") || "Sessão UR"}
                  </p>
                  <p className="mt-4 text-xs text-zinc-600">
                    Abra a agenda para consultar o estado completo.
                  </p>
                </Link>
              ),
            )}
          </div>
        </section>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-3">
        <Link
          href="/athlete/season"
          className="group min-h-48 rounded-[1.75rem] border border-white/8 bg-white/[.02] p-6 transition-colors hover:border-ur-gold/25"
        >
          <CalendarDays className="text-ur-gold" size={24} aria-hidden="true" />
          <p className="text-ur-gold mt-6 text-[.62rem] font-black tracking-[.18em] uppercase">
            Temporada
          </p>
          <h2 className="font-display mt-2 text-2xl font-black uppercase">
            Entenda sua campanha
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Veja fases, critérios e o caminho competitivo da temporada.
          </p>
          <ArrowRight
            className="text-ur-gold mt-5 transition-transform group-hover:translate-x-1"
            size={18}
            aria-hidden="true"
          />
        </Link>

        <Link
          href="/athlete/hunter"
          className="group min-h-48 rounded-[1.75rem] border border-ur-gold/20 bg-[radial-gradient(circle_at_90%_10%,rgba(234,179,8,.09),transparent_38%),rgba(255,255,255,.02)] p-6 transition-colors hover:border-ur-gold/40"
        >
          <Sparkles className="text-ur-gold" size={24} aria-hidden="true" />
          <p className="text-ur-gold mt-6 text-[.62rem] font-black tracking-[.18em] uppercase">
            Hunter
          </p>
          <h2 className="font-display mt-2 text-2xl font-black uppercase">
            Desenvolvimento para quem quer ir além
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Conheça a metodologia de desenvolvimento do Ultimate Rivals.
          </p>
          <ArrowRight
            className="text-ur-gold mt-5 transition-transform group-hover:translate-x-1"
            size={18}
            aria-hidden="true"
          />
        </Link>

        <Link
          href="/athlete/highlights"
          className="group min-h-48 rounded-[1.75rem] border border-white/8 bg-white/[.02] p-6 transition-colors hover:border-ur-gold/25"
        >
          <Clapperboard className="text-ur-gold" size={24} aria-hidden="true" />
          <p className="text-ur-gold mt-6 text-[.62rem] font-black tracking-[.18em] uppercase">
            Destaques
          </p>
          <h2 className="font-display mt-2 text-2xl font-black uppercase">
            {latestHighlight?.title ?? "Sua história em evidência"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            {latestHighlightAsset?.title ??
              "Mídia publicada e momentos oficiais aparecem aqui quando disponíveis."}
          </p>
          <div className="mt-5 flex items-center gap-3">
            <ArrowRight
              className="text-ur-gold transition-transform group-hover:translate-x-1"
              size={18}
              aria-hidden="true"
            />
            {latestHighlightUrl ? (
              <span className="inline-flex items-center gap-1 text-xs font-black text-zinc-500">
                mídia disponível <ExternalLink size={12} aria-hidden="true" />
              </span>
            ) : null}
          </div>
        </Link>
      </section>

      <section className="grid gap-4">
        <SectionHeading
          eyebrow="Recompensas"
          title="Economia vem depois do jogo"
          href="/athlete/wallet"
          cta="Abrir Wallet"
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[1.5rem] border border-white/8 bg-white/[.018] p-5">
            <Coins className="text-ur-gold" size={20} aria-hidden="true" />
            <p className="mt-4 text-xs font-black tracking-[.16em] text-zinc-600 uppercase">
              UR Coins
            </p>
            <p className="font-display mt-1 text-3xl font-black">
              {economyReliable
                ? summary.urCoinBalance.toLocaleString("pt-BR")
                : "Indisponível"}
            </p>
            {!economyReliable ? (
              <p className="mt-2 text-xs leading-5 text-zinc-600">
                A fonte econômica não será tratada como saldo zero.
              </p>
            ) : null}
          </div>
          <div className="rounded-[1.5rem] border border-white/8 bg-white/[.018] p-5">
            <CreditCard className="text-ur-gold" size={20} aria-hidden="true" />
            <p className="mt-4 text-xs font-black tracking-[.16em] text-zinc-600 uppercase">
              Créditos livres
            </p>
            <p className="font-display mt-1 text-3xl font-black">
              {snapshot.creditBalance === null
                ? "Indisponível"
                : snapshot.creditBalance.toLocaleString("pt-BR")}
            </p>
          </div>
          <Link
            href="/athlete/market"
            className="group rounded-[1.5rem] border border-white/8 bg-white/[.018] p-5 transition-colors hover:border-ur-gold/25"
          >
            <Trophy className="text-ur-gold" size={20} aria-hidden="true" />
            <p className="mt-4 text-xs font-black tracking-[.16em] text-zinc-600 uppercase">
              UR Market
            </p>
            <p className="font-display mt-1 text-3xl font-black">Resgatar</p>
            <p className="mt-2 text-xs leading-5 text-zinc-600">
              Produtos, benefícios e experiências disponíveis no ecossistema.
            </p>
          </Link>
        </div>
      </section>

      {snapshot.billing && snapshot.billing.openItems > 0 ? (
        <section className="flex items-start gap-3 rounded-[1.5rem] border border-ur-gold/20 bg-ur-gold/[.04] p-5">
          <CreditCard
            className="text-ur-gold mt-0.5 shrink-0"
            size={18}
            aria-hidden="true"
          />
          <div>
            <p className="font-bold">Financeiro pendente</p>
            <p className="mt-1 text-sm text-zinc-400">
              {snapshot.billing.openItems} item(ns) em aberto ·{" "}
              {money.format(snapshot.billing.openAmount)}.
            </p>
          </div>
        </section>
      ) : null}

      <AthleteSourceHealth errors={snapshot.sourceErrors} />
    </div>
  );
}
