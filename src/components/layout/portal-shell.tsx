import {
  CalendarDays,
  HandCoins,
  Handshake,
  LayoutDashboard,
  LogOut,
  MapPin,
  Package,
  PanelsTopLeft,
  ReceiptText,
  ShieldCheck,
  Trophy,
  UserRound,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  AthleteDesktopNavigation,
  AthleteMobileNavigation,
  NotificationLink,
} from "@/components/athlete/athlete-navigation";
import { InstallAppPrompt } from "@/components/athlete/install-app-prompt";
import { stopAthleteMirrorAction } from "@/features/admin-athlete-mirror/actions";
import { BrandMark } from "./brand-mark";

export function PortalShell({
  portal,
  userLabel,
  children,
  notificationCount = 0,
  athleteIdentity,
  athleteMirror = null,
  canUseAthleteMirror = false,
}: {
  portal: "Administração" | "Atleta" | "Equipe";
  userLabel: string;
  children: ReactNode;
  notificationCount?: number;
  athleteIdentity?: { publicName: string; athleteCode: string } | null;
  athleteMirror?: { athleteId: string; publicName: string; athleteCode: string } | null;
  canUseAthleteMirror?: boolean;
}) {
  const home =
    portal === "Atleta" ? "/athlete" : portal === "Equipe" ? "/team" : "/admin";
  const links =
    portal === "Atleta"
      ? [
          { href: "/athlete/profile", label: "Meu perfil", icon: UserRound },
          { href: "/athlete/agenda", label: "Agenda UR", icon: CalendarDays },
          { href: "/athlete/ur-play", label: "UR Play", icon: CalendarDays },
          { href: "/athlete/billing", label: "Pagamentos", icon: ShieldCheck },
          { href: "/athlete/points", label: "Meus pontos", icon: Trophy },
          { href: "/athlete/ranking", label: "Meu ranking", icon: Trophy },
          {
            href: "/athlete/development",
            label: "Desenvolvimento",
            icon: CalendarDays,
          },
        ]
      : portal === "Equipe"
        ? [
            { href: "/team/athletes", label: "Atletas", icon: UserRound },
            { href: "/team/formations", label: "Formações", icon: UsersRound },
            { href: "/team/roster", label: "Elenco", icon: UsersRound },
            { href: "/team/competitions", label: "Competições", icon: Trophy },
            { href: "/team/calendar", label: "Calendário", icon: CalendarDays },
            { href: "/team/ranking", label: "Ranking", icon: Trophy },
          ]
        : [
            { href: "/admin/athletes", label: "Atletas", icon: UserRound },
            { href: "/admin/teams", label: "Equipes", icon: UsersRound },
            { href: "/admin/poles", label: "Polos", icon: MapPin },
            { href: "/admin/venues", label: "Venues", icon: MapPin },
            { href: "/admin/seasons", label: "Temporadas", icon: CalendarDays },
            {
              href: "/admin/calendar",
              label: "Calendário",
              icon: CalendarDays,
            },
            { href: "/admin/staff", label: "Staff", icon: ShieldCheck },
            { href: "/admin/leveling", label: "Nivelamento", icon: UserRound },
            {
              href: "/admin/assessments",
              label: "Avaliações",
              icon: CalendarDays,
            },
            { href: "/admin/ur-play", label: "UR Play", icon: CalendarDays },
            { href: "/admin/demand", label: "Demand", icon: CalendarDays },
            {
              href: "/admin/acquisition",
              label: "Acquisition",
              icon: PanelsTopLeft,
            },
            {
              href: "/admin/tournaments",
              label: "Torneios",
              icon: Trophy,
            },
            {
              href: "/admin/events",
              label: "UR Events",
              icon: CalendarDays,
            },
            {
              href: "/admin/sponsors",
              label: "Sponsors",
              icon: Handshake,
            },
            {
              href: "/admin/market",
              label: "Market",
              icon: Package,
            },
            {
              href: "/admin/media",
              label: "Mídia",
              icon: PanelsTopLeft,
            },
            {
              href: "/admin/reports",
              label: "Relatórios",
              icon: ReceiptText,
            },
            {
              href: "/admin/payments",
              label: "Pagamentos",
              icon: ShieldCheck,
            },
            {
              href: "/admin/prizes",
              label: "Premiações",
              icon: HandCoins,
            },
            {
              href: "/admin/finance",
              label: "Financeiro",
              icon: ReceiptText,
            },
            {
              href: "/admin/ranking-engine",
              label: "Motor de pontos",
              icon: Trophy,
            },
            { href: "/admin/rankings", label: "Rankings", icon: Trophy },
            { href: "/ops/ur-play", label: "Court Ops", icon: MapPin },
          ];
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="bg-ur-graphite border-b lg:min-h-dvh lg:border-r lg:border-b-0">
        <div className="flex h-18 items-center justify-between px-5 lg:block lg:h-auto lg:p-6">
          <BrandMark />
          <span className="text-xs font-bold tracking-wider text-zinc-500 uppercase lg:mt-3 lg:block">
            Portal {portal}
          </span>
          {portal === "Administração" && canUseAthleteMirror && (
            <div className="mt-4 hidden grid-cols-2 gap-2 lg:grid">
              <Link href="/admin" className="rounded-ur bg-ur-gold text-ur-black px-3 py-2 text-center text-xs font-black uppercase">Controle</Link>
              <Link href="/admin/mirror" className="rounded-ur border border-ur-gold/40 px-3 py-2 text-center text-xs font-black uppercase text-ur-gold">Espelho</Link>
            </div>
          )}
          {portal === "Administração" && (
            <form action="/admin/search" className="mt-3 hidden lg:block">
              <input name="q" aria-label="Busca global" placeholder="Buscar no ecossistema" className="rounded-ur min-h-10 w-full border bg-black px-3 text-sm" />
            </form>
          )}
        </div>
        {portal === "Atleta" ? (
          <AthleteDesktopNavigation mirror={Boolean(athleteMirror)} />
        ) : (
          <nav
            aria-label="Navegação principal"
            className="hidden space-y-1 px-4 lg:block"
          >
            <Link
              href={home}
              className="rounded-ur bg-ur-gold text-ur-black flex min-h-11 items-center gap-3 px-3 font-bold"
            >
              <LayoutDashboard size={18} aria-hidden="true" />
              Visão geral
            </Link>
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="rounded-ur flex min-h-11 items-center gap-3 px-3 font-medium text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </Link>
            ))}
          </nav>
        )}
        <div className="hidden border-t p-4 lg:fixed lg:bottom-0 lg:block lg:w-[17rem]">
          <p className="flex items-center gap-2 truncate text-sm text-zinc-300">
            <UserRound size={16} aria-hidden="true" />
            {userLabel}
          </p>
          <form action="/auth/signout" method="post">
            <button className="rounded-ur mt-3 flex min-h-11 w-full cursor-pointer items-center gap-2 px-3 text-sm text-zinc-400 hover:bg-white/5 hover:text-white">
              <LogOut size={16} aria-hidden="true" />
              Sair
            </button>
          </form>
        </div>
      </aside>
      <div className="min-w-0">
        {athleteMirror && (
          <div className="border-ur-gold/40 bg-ur-gold/10 sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 backdrop-blur sm:px-8 lg:px-10">
            <div>
              <p className="text-ur-gold text-[.65rem] font-black tracking-[.2em] uppercase">ESPELHO DO ATLETA</p>
              <p className="text-sm font-black">Visualizando como: {athleteMirror.publicName} · {athleteMirror.athleteCode}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/admin/mirror" className="rounded-ur border border-ur-gold/40 px-3 py-2 text-xs font-black">Trocar atleta</Link>
              <form action={stopAthleteMirrorAction}>
                <button className="rounded-ur bg-ur-gold text-ur-black px-3 py-2 text-xs font-black">Voltar ao Controle</button>
              </form>
            </div>
          </div>
        )}
        {portal === "Atleta" && (
          <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-zinc-900 bg-[#080808]/95 px-4 backdrop-blur sm:px-8 lg:px-10">
            <div className="min-w-0">
              <p className="truncate text-sm font-black">
                {athleteIdentity?.publicName ?? "Atleta"}
              </p>
              <p className="text-[.65rem] font-bold tracking-[.16em] text-zinc-500 uppercase">
                {athleteIdentity?.athleteCode ?? "Ultimate Rivals"}
              </p>
            </div>
            {!athleteMirror && <NotificationLink count={notificationCount} />}
          </header>
        )}
        <main
          className={
            portal === "Atleta"
              ? "min-w-0 p-4 pb-24 sm:p-8 sm:pb-24 lg:p-10"
              : "min-w-0 p-5 sm:p-8 lg:p-10"
          }
        >
          {athleteMirror ? (
            <div className="[&_a]:pointer-events-none [&_a]:opacity-70 [&_button]:pointer-events-none [&_button]:opacity-60 [&_form]:pointer-events-none [&_form]:opacity-70 [&_input]:pointer-events-none [&_select]:pointer-events-none [&_textarea]:pointer-events-none">
              {children}
            </div>
          ) : children}
        </main>
      </div>
      {portal === "Atleta" && (
        <>
          <AthleteMobileNavigation />
          {!athleteMirror && <InstallAppPrompt />}
        </>
      )}
    </div>
  );
}
