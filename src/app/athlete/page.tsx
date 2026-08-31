import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Clapperboard,
  Coins,
  CreditCard,
  GraduationCap,
  Shield,
  Sparkles,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AthleteOpportunityCard } from "@/components/athlete/athlete-opportunity-card";
import { AthleteSourceHealth } from "@/components/athlete/athlete-source-health";
import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";
import { createClient } from "@/lib/supabase/server";
import { getAthleteSnapshotForViewer } from "@/server/services/athlete-viewer-snapshot-service";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

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

function movementLabel(movement: string | null | undefined) {
  if (movement === "up") return "Subindo";
  if (movement === "down") return "Em disputa";
  if (movement === "stable") return "Estável";
  return "Sem leitura";
}

function SectionHeading({
  eyebrow,
  title,
  href,
  linkLabel,
}: {
  eyebrow: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="athlete-kicker">{eyebrow}</p>
        <h2 className="font-display mt-1 text-2xl leading-none font-black tracking-tight uppercase sm:text-3xl">
          {title}
        </h2>
      </div>
      {href && linkLabel ? (
        <Link
          href={href}
          className="text-ur-gold flex min-h-11 shrink-0 items-center gap-1 text-[.64rem] font-black tracking-[.08em] uppercase"
        >
          {linkLabel} <ChevronRight size={15} aria-hidden="true" />
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
        <section className="athlete-stage p-6 sm:p-8">
          <p className="athlete-kicker">Sua carreira UR</p>
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
  const team = snapshot.teams?.[0] ?? null;
  const opportunities = (snapshot.opportunities ?? [])
    .filter((item) => item.id !== nextReservation?.id)
    .slice(0, 3);
  const creditsKnown = snapshot.creditBalance !== null;
  const economyReliable = snapshot.state === "ready" && summary !== null;
  const location = [snapshot.identity.city, snapshot.identity.state]
    .filter(Boolean)
    .join("/");
  const identityMeta = [snapshot.identity.athleteCode, summary?.level, location]
    .filter(Boolean)
    .join(" · ");

  const nextAction = nextReservation
    ? {
        title: nextReservation.title,
        description: [nextReservation.poleName, nextReservation.venueName]
          .filter(Boolean)
          .join(" · "),
        href: "/athlete/agenda",
        cta: "Abrir atividade",
      }
    : opportunities.length > 0
      ? {
          title: "Escolha onde jogar agora",
          description: `${opportunities.length} oportunidade${opportunities.length > 1 ? "s" : ""} disponível${opportunities.length > 1 ? "eis" : ""} na sua agenda UR.`,
          href: "/athlete/agenda",
          cta: "Ver oportunidades",
        }
      : {
          title: "Prepare sua próxima entrada em quadra",
          description:
            "A agenda ainda não apresenta uma oportunidade disponível. Mantenha sua disponibilidade atualizada.",
          href: "/athlete/disponibilidade",
          cta: "Atualizar disponibilidade",
        };

  return (
    <div className="mx-auto grid max-w-7xl gap-8 pb-5 sm:gap-10">
      <section className="athlete-stage -mx-1 px-5 py-6 sm:mx-0 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
        <div className="grid gap-8 lg:grid-cols-[1.25fr_.75fr] lg:items-end">
          <div className="min-w-0">
            <p className="athlete-kicker">Sua carreira está em jogo</p>
            <div className="mt-4 flex items-center gap-4 sm:gap-5">
              <div className="border-ur-gold/45 relative grid size-[4.75rem] shrink-0 place-items-center overflow-hidden rounded-[.25rem_1.5rem_.25rem_1.5rem] border bg-black/55 shadow-[0_0_40px_rgba(244,196,48,.1)] sm:size-24">
                {snapshot.identity.avatarUrl ? (
                  <Image
                    src={snapshot.identity.avatarUrl}
                    alt={`Foto de ${snapshot.identity.publicName}`}
                    fill
                    priority
                    sizes="(max-width: 640px) 76px, 96px"
                    className="object-cover"
                  />
                ) : (
                  <span className="font-display text-ur-gold text-2xl font-black sm:text-3xl">
                    {initials(snapshot.identity.publicName)}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[.62rem] font-black tracking-[.16em] text-zinc-500 uppercase">
                  Bem-vindo de volta
                </p>
                <h1 className="font-display mt-1 truncate text-4xl leading-[.88] font-black tracking-[-.025em] uppercase sm:text-6xl">
                  {snapshot.identity.publicName}
                </h1>
                <p className="mt-2 truncate text-xs font-bold text-zinc-400 sm:text-sm">
                  {identityMeta || "Atleta Ultimate Rivals"}
                </p>
              </div>
            </div>

            <div className="mt-7 max-w-2xl">
              <p className="athlete-kicker">Próximo movimento</p>
              <h2 className="font-display mt-2 text-3xl leading-[.94] font-black tracking-tight uppercase sm:text-5xl">
                {nextAction.title}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
                {nextAction.description}
              </p>
              <Link href={nextAction.href} className="athlete-action mt-5">
                {nextAction.cta} <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="athlete-panel athlete-panel-gold grid grid-cols-[1fr_auto] gap-5 p-5 sm:p-6 lg:grid-cols-1">
            <div>
              <p className="text-[.6rem] font-black tracking-[.18em] text-zinc-500 uppercase">
                Posição atual
              </p>
              <p className="font-display text-ur-gold mt-1 text-7xl leading-none font-black sm:text-8xl">
                {ranking?.currentPosition ?? "—"}
                {ranking?.currentPosition ? (
                  <sup className="ml-1 text-2xl">º</sup>
                ) : null}
              </p>
              <p className="mt-1 text-xs font-black tracking-[.1em] uppercase">
                {ranking
                  ? `${ranking.totalPoints.toLocaleString("pt-BR")} pontos oficiais`
                  : "Ranking ainda não publicado"}
              </p>
            </div>
            <div className="border-l border-white/10 pl-5 lg:grid lg:grid-cols-3 lg:border-t lg:border-l-0 lg:pt-5 lg:pl-0">
              {[
                ["Jogos", ranking?.gamesPlayed ?? "—"],
                ["Vitórias", ranking?.wins ?? "—"],
                ["Movimento", movementLabel(ranking?.movement)],
              ].map(([label, value], index) => (
                <div key={label} className={index > 0 ? "mt-3 lg:mt-0" : ""}>
                  <p className="text-[.56rem] font-black text-zinc-600 uppercase">
                    {label}
                  </p>
                  <p className="font-display text-ur-gold mt-1 text-xl font-black lg:text-2xl">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="athlete-panel p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="athlete-kicker">Temporada atual</p>
            <h2 className="font-display mt-1 text-2xl font-black uppercase">
              Sua jornada competitiva
            </h2>
          </div>
          <Link
            href="/athlete/season"
            className="text-ur-gold flex min-h-11 items-center gap-1 text-[.62rem] font-black uppercase"
          >
            Ver temporada <ChevronRight size={15} aria-hidden="true" />
          </Link>
        </div>
        <div className="relative mt-6 grid grid-cols-4 gap-2">
          <span className="athlete-season-track absolute top-5 right-[12%] left-[12%] h-px" />
          {[
            { label: "Jogar", href: "/athlete/agenda", Icon: CalendarDays },
            { label: "Ranking", href: "/athlete/ranking", Icon: Trophy },
            { label: "Equipe", href: "/athlete/team", Icon: Users },
            { label: "Evolução", href: "/athlete/development", Icon: Target },
          ].map(({ label, href, Icon }, index) => (
            <Link
              key={label}
              href={href}
              className="relative z-10 flex min-w-0 flex-col items-center gap-2 text-center"
            >
              <span
                className={`grid size-10 place-items-center rounded-full border ${index === 0 ? "border-ur-gold bg-ur-gold text-black shadow-[0_0_30px_rgba(244,196,48,.18)]" : "border-white/15 bg-[#0a0a0a] text-zinc-500"}`}
              >
                <Icon size={18} aria-hidden="true" />
              </span>
              <span className="truncate text-[.57rem] font-black tracking-[.05em] uppercase sm:text-[.68rem]">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {nextReservation ? (
        <section className="grid gap-4">
          <SectionHeading
            eyebrow="Você está dentro"
            title="Próximo compromisso"
            href="/athlete/agenda"
            linkLabel="Agenda"
          />
          {creditsKnown ? (
            <AthleteOpportunityCard
              opportunity={nextReservation}
              availableCredits={snapshot.creditBalance}
              readOnly={viewer.isPreview}
            />
          ) : (
            <div className="athlete-panel p-5">
              <p className="font-black">{nextReservation.title}</p>
              <p className="mt-3 text-xs leading-5 text-zinc-500">
                Os créditos estão temporariamente indisponíveis. A atividade é
                exibida sem assumir saldo financeiro.
              </p>
            </div>
          )}
        </section>
      ) : null}

      {opportunities.length > 0 ? (
        <section className="grid gap-4">
          <SectionHeading
            eyebrow="Entre em quadra"
            title="Oportunidades para jogar"
            href="/athlete/agenda"
            linkLabel="Ver todas"
          />
          <div className="grid gap-4 lg:grid-cols-3">
            {opportunities.map((opportunity) =>
              creditsKnown ? (
                <AthleteOpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  availableCredits={snapshot.creditBalance}
                  readOnly={viewer.isPreview}
                />
              ) : (
                <Link
                  key={opportunity.id}
                  href="/athlete/agenda"
                  className="athlete-panel p-5"
                >
                  <p className="font-black">{opportunity.title}</p>
                  <p className="mt-3 text-xs text-zinc-500">
                    Abra a agenda para consultar o estado completo.
                  </p>
                </Link>
              ),
            )}
          </div>
        </section>
      ) : null}

      <section className="grid gap-4">
        <SectionHeading
          eyebrow="Sua temporada"
          title="Desempenho oficial"
          href="/athlete/ranking"
          linkLabel="Ranking"
        />
        <div className="athlete-panel grid grid-cols-2 overflow-hidden sm:grid-cols-4">
          {[
            ["Jogos", summary?.games ?? null],
            ["Vitórias", ranking?.wins ?? null],
            [
              "Aproveitamento",
              ranking ? `${ranking.winRate.toFixed(1)}%` : null,
            ],
            ["Competições", summary?.competitions ?? null],
          ].map(([label, value]) => (
            <div
              key={label as string}
              className="border-r border-b border-white/[.07] p-5 last:border-r-0 sm:border-b-0"
            >
              <p className="text-[.58rem] font-black tracking-[.12em] text-zinc-600 uppercase">
                {label}
              </p>
              <p className="font-display mt-2 text-4xl font-black">
                {value ?? "—"}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Link
          href="/athlete/team"
          className="athlete-panel athlete-panel-gold group grid min-h-48 grid-cols-[auto_1fr_auto] items-center gap-4 p-5 sm:p-6"
        >
          <span className="border-ur-gold/30 grid size-16 place-items-center overflow-hidden rounded-[.25rem_1.2rem_.25rem_1.2rem] border bg-black/40">
            {team?.logoUrl ? (
              <Image
                src={team.logoUrl}
                alt={`Escudo ${team.name}`}
                width={96}
                height={96}
                className="size-full object-contain p-2"
              />
            ) : (
              <Shield className="text-ur-gold" size={28} aria-hidden="true" />
            )}
          </span>
          <span>
            <span className="athlete-kicker block">Sua equipe</span>
            <strong className="font-display mt-2 block text-3xl leading-none font-black uppercase">
              {team?.name ?? "Formações da temporada"}
            </strong>
            <span className="mt-2 block text-xs text-zinc-500">
              {team
                ? "Sua formação dentro da temporada UR."
                : "Convites e formações aparecem quando publicados."}
            </span>
          </span>
          <ArrowRight
            className="text-ur-gold transition-transform group-hover:translate-x-1"
            size={21}
            aria-hidden="true"
          />
        </Link>

        <Link
          href="/athlete/development"
          className="athlete-panel group min-h-48 p-6"
        >
          <Target className="text-ur-gold" size={24} aria-hidden="true" />
          <p className="athlete-kicker mt-7">Como chegar lá</p>
          <h2 className="font-display mt-2 text-2xl font-black uppercase">
            Seu próximo passo nasce da evidência
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Acompanhe somente prioridades e revisões oficialmente publicadas.
          </p>
        </Link>
      </section>

      <section className="grid gap-4">
        <SectionHeading eyebrow="Explore" title="Universo Ultimate Rivals" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/athlete/season" className="athlete-panel min-h-44 p-5">
            <CalendarDays
              className="text-ur-gold"
              size={22}
              aria-hidden="true"
            />
            <p className="athlete-kicker mt-8">Temporada</p>
            <h3 className="font-display mt-2 text-xl font-black uppercase">
              Entenda a campanha
            </h3>
          </Link>
          <Link
            href="/athlete/hunter"
            className="athlete-panel athlete-panel-gold min-h-44 p-5"
          >
            <GraduationCap
              className="text-ur-gold"
              size={22}
              aria-hidden="true"
            />
            <p className="athlete-kicker mt-8">Hunter</p>
            <h3 className="font-display mt-2 text-xl font-black uppercase">
              Desenvolvimento opt-in
            </h3>
          </Link>
          <Link href="/athlete/market" className="athlete-panel min-h-44 p-5">
            <Sparkles className="text-ur-gold" size={22} aria-hidden="true" />
            <p className="athlete-kicker mt-8">UR Market</p>
            <h3 className="font-display mt-2 text-xl font-black uppercase">
              Benefícios do ecossistema
            </h3>
          </Link>
          <Link
            href="/athlete/highlights"
            className="athlete-panel min-h-44 p-5"
          >
            <Clapperboard
              className="text-ur-gold"
              size={22}
              aria-hidden="true"
            />
            <p className="athlete-kicker mt-8">Último destaque</p>
            <h3 className="font-display mt-2 text-xl font-black uppercase">
              {latestHighlight?.title ?? "Sua história em evidência"}
            </h3>
            {latestHighlightUrl ? (
              <span className="mt-2 block text-xs font-bold text-zinc-500">
                Mídia publicada disponível
              </span>
            ) : null}
          </Link>
        </div>
      </section>

      <section className="grid gap-4">
        <SectionHeading
          eyebrow="Economia"
          title="Moedas e créditos"
          href="/athlete/wallet"
          linkLabel="Wallet"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="athlete-panel p-5">
            <Coins className="text-ur-gold" size={21} aria-hidden="true" />
            <p className="mt-5 text-[.58rem] font-black tracking-[.15em] text-zinc-600 uppercase">
              UR Coins
            </p>
            <p className="font-display mt-1 text-4xl font-black">
              {economyReliable
                ? summary.urCoinBalance.toLocaleString("pt-BR")
                : "Indisponível"}
            </p>
          </div>
          <div className="athlete-panel p-5">
            <CreditCard className="text-ur-gold" size={21} aria-hidden="true" />
            <p className="mt-5 text-[.58rem] font-black tracking-[.15em] text-zinc-600 uppercase">
              Créditos livres
            </p>
            <p className="font-display mt-1 text-4xl font-black">
              {snapshot.creditBalance === null
                ? "Indisponível"
                : snapshot.creditBalance.toLocaleString("pt-BR")}
            </p>
          </div>
        </div>
      </section>

      {snapshot.billing && snapshot.billing.openItems > 0 ? (
        <section className="athlete-panel athlete-panel-gold p-5">
          <p className="font-bold">Financeiro pendente</p>
          <p className="mt-1 text-sm text-zinc-400">
            {snapshot.billing.openItems} item(ns) em aberto ·{" "}
            {money.format(snapshot.billing.openAmount)}.
          </p>
        </section>
      ) : null}

      <AthleteSourceHealth errors={snapshot.sourceErrors} />
    </div>
  );
}
