import {
  CalendarDays,
  HandCoins,
  LayoutDashboard,
  LogOut,
  MapPin,
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
import { BrandMark } from "./brand-mark";

export function PortalShell({
  portal,
  userLabel,
  children,
  notificationCount = 0,
  athleteIdentity,
}: {
  portal: "Administração" | "Atleta" | "Equipe";
  userLabel: string;
  children: ReactNode;
  notificationCount?: number;
  athleteIdentity?: { publicName: string; athleteCode: string } | null;
}) {
  const home =
    portal === "Atleta" ? "/athlete" : portal === "Equipe" ? "/team" : "/admin";
  const links =
    portal === "Atleta"
      ? [
          { href: "/athlete/profile", label: "Meu perfil", icon: UserRound },
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
            {
              href: "/admin/tournaments",
              label: "Torneios",
              icon: Trophy,
            },
            {
              href: "/admin/payments",
              label: "Pagamentos",
              icon: ShieldCheck,
            },
            {
              href: "/admin/prizes",
              label: "PremiaÃ§Ãµes",
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
        </div>
        {portal === "Atleta" ? (
          <AthleteDesktopNavigation />
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
            <NotificationLink count={notificationCount} />
          </header>
        )}
        <main
          className={
            portal === "Atleta"
              ? "min-w-0 p-4 pb-24 sm:p-8 sm:pb-24 lg:p-10"
              : "min-w-0 p-5 sm:p-8 lg:p-10"
          }
        >
          {children}
        </main>
      </div>
      {portal === "Atleta" && (
        <>
          <AthleteMobileNavigation />
          <InstallAppPrompt />
        </>
      )}
    </div>
  );
}
