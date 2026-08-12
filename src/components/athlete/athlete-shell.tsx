"use client";

import {
  CalendarDays,
  CircleUserRound,
  Clapperboard,
  Clock3,
  Coins,
  House,
  LogOut,
  MapPin,
  MessageSquareText,
  Medal,
  ShoppingBag,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { stopAthletePreviewAction } from "@/features/admin-athlete-preview/actions";
import { BrandMark } from "@/components/layout/brand-mark";
import { cn } from "@/lib/utils";

const desktopPrimary = [
  { href: "/athlete", label: "Início", icon: House, exact: true },
  {
    href: "/athlete/agenda",
    label: "Agenda",
    icon: CalendarDays,
    exact: false,
  },
  {
    href: "/athlete/disponibilidade",
    label: "Disponibilidade",
    icon: Clock3,
    exact: false,
  },
  { href: "/athlete/ranking", label: "Ranking", icon: Trophy, exact: false },
  {
    href: "/athlete/results",
    label: "Resultados",
    icon: Medal,
    exact: false,
  },
  { href: "/athlete/team", label: "Equipe", icon: Users, exact: false },
  {
    href: "/athlete/perfil",
    label: "Perfil",
    icon: CircleUserRound,
    exact: false,
  },
] as const;

const mobilePrimary = [
  { href: "/athlete", label: "Início", icon: House, exact: true },
  { href: "/athlete/agenda", label: "Jogar", icon: CalendarDays, exact: false },
  { href: "/athlete/ranking", label: "Ranking", icon: Trophy, exact: false },
  { href: "/athlete/season", label: "Temporada", icon: Medal, exact: false },
  {
    href: "/athlete/perfil",
    label: "Perfil",
    icon: CircleUserRound,
    exact: false,
  },
] as const;

const journey = [
  { href: "/athlete/season", label: "Temporada", icon: Medal },
  { href: "/athlete/results", label: "Resultados", icon: Trophy },
  { href: "/athlete/team", label: "Equipe", icon: Users },
  { href: "/athlete/development", label: "Missões e evolução", icon: Target },
  { href: "/athlete/arenas", label: "Arenas UR", icon: MapPin },
  { href: "/athlete/highlights", label: "Destaques", icon: Clapperboard },
  { href: "/athlete/feedback", label: "Feedback UR", icon: MessageSquareText },
  { href: "/athlete/wallet", label: "Wallet URC", icon: Coins },
  { href: "/athlete/market", label: "UR Market", icon: ShoppingBag },
] as const;

function active(pathname: string, href: string, exact?: boolean) {
  return exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

function NavigationLink({
  href,
  label,
  Icon,
  pathname,
  exact,
}: {
  href: string;
  label: string;
  Icon:
    | (typeof desktopPrimary)[number]["icon"]
    | (typeof journey)[number]["icon"];
  pathname: string;
  exact?: boolean;
}) {
  const isActive = active(pathname, href, exact);
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "rounded-ur flex min-h-11 items-center gap-3 px-3 font-bold transition-colors",
        isActive
          ? "bg-ur-gold text-ur-black"
          : "text-zinc-300 hover:bg-white/5 hover:text-white",
      )}
    >
      <Icon size={18} aria-hidden="true" />
      {label}
    </Link>
  );
}

function DesktopNavigation({ preview = false }: { preview?: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navegação do atleta" className="hidden px-4 lg:block">
      <div className="space-y-1">
        {desktopPrimary.map(({ href, label, icon: Icon, exact }) => (
          <NavigationLink
            key={href}
            href={href}
            label={label}
            Icon={Icon}
            pathname={pathname}
            exact={exact}
          />
        ))}
      </div>
      <div className="mt-6 border-t border-white/10 pt-5">
        <p className="mb-2 px-3 text-[.65rem] font-black tracking-[.2em] text-zinc-600 uppercase">
          Jornada e carreira
        </p>
        <div className="space-y-1">
          {journey
            .filter((item) => !preview || item.href !== "/athlete/feedback")
            .map(({ href, label, icon: Icon }) => (
              <NavigationLink
                key={href}
                href={href}
                label={label}
                Icon={Icon}
                pathname={pathname}
              />
            ))}
        </div>
      </div>
    </nav>
  );
}

function MobileNavigation() {
  const pathname = usePathname();
  return (
    <div className="relative shrink-0 border-t border-zinc-800 bg-[#0b0b0b]/[.98] pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <nav aria-label="Navegação principal do atleta">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {mobilePrimary.map(({ href, label, icon: Icon, exact }) => {
            const isActive = active(pathname, href, exact);
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[.65rem] font-bold transition-colors",
                  isActive ? "text-ur-gold" : "text-zinc-500 hover:text-white",
                )}
              >
                <Icon
                  size={21}
                  strokeWidth={isActive ? 2.5 : 2}
                  aria-hidden="true"
                />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
      <details className="border-t border-white/5">
        <summary className="mx-auto flex min-h-10 max-w-lg cursor-pointer items-center justify-center text-xs font-black tracking-[.14em] text-zinc-400 uppercase">
          Jornada e carreira
        </summary>
        <nav
          aria-label="Jornada e carreira do atleta"
          className="mx-auto grid max-w-lg grid-cols-2 gap-1 px-3 pb-3"
        >
          {journey.map(({ href, label, icon: Icon }) => {
            const isActive = active(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "rounded-ur flex min-h-10 items-center gap-2 px-3 text-xs font-bold",
                  isActive
                    ? "bg-ur-gold text-ur-black"
                    : "bg-white/5 text-zinc-300 hover:text-white",
                )}
              >
                <Icon size={15} aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>
      </details>
    </div>
  );
}

export function AthleteShell({
  userLabel,
  preview,
  children,
}: {
  userLabel: string;
  preview?: { publicName: string; athleteCode: string } | null;
  children: ReactNode;
}) {
  return (
    <div className="grid h-dvh grid-rows-[minmax(0,1fr)_auto] overflow-hidden bg-[#080808] text-white lg:h-auto lg:min-h-dvh lg:grid-cols-[17rem_1fr] lg:grid-rows-none lg:overflow-visible">
      <aside className="bg-ur-graphite hidden min-h-dvh border-r lg:flex lg:flex-col">
        <div className="p-6">
          <BrandMark />
          <span className="mt-3 block text-xs font-bold tracking-wider text-zinc-500 uppercase">
            App do Atleta
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pb-6">
          <DesktopNavigation preview={Boolean(preview)} />
        </div>
        <div className="border-t p-4">
          <p className="truncate text-sm font-bold text-zinc-300">
            {userLabel}
          </p>
          {!preview && (
            <form action="/auth/signout" method="post">
              <button className="rounded-ur mt-3 flex min-h-11 w-full items-center gap-2 px-3 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-white">
                <LogOut size={16} aria-hidden="true" />
                Sair
              </button>
            </form>
          )}
        </div>
      </aside>
      <div className="min-h-0 min-w-0 overflow-y-auto lg:overflow-visible">
        {preview && (
          <div className="border-ur-gold/40 bg-ur-gold/10 sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 backdrop-blur sm:px-8 lg:px-10">
            <div>
              <p className="text-ur-gold text-[.65rem] font-black tracking-[.2em] uppercase">
                Prévia do Atleta · somente leitura
              </p>
              <p className="text-sm font-black">
                {preview.publicName} · {preview.athleteCode}
              </p>
            </div>
            <form action={stopAthletePreviewAction}>
              <button className="bg-ur-gold text-ur-black rounded-ur min-h-10 px-4 text-xs font-black uppercase">
                Voltar ao Command
              </button>
            </form>
          </div>
        )}
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-zinc-900 bg-[#080808]/95 px-4 backdrop-blur sm:px-8 lg:px-10">
          <div className="min-w-0 lg:hidden">
            <BrandMark />
          </div>
          <div className="min-w-0 lg:ml-auto lg:text-right">
            <p className="truncate text-sm font-black">{userLabel}</p>
            <p className="text-[.65rem] font-bold tracking-[.16em] text-zinc-500 uppercase">
              Ultimate Rivals
            </p>
          </div>
        </header>
        <main
          className={cn(
            "min-w-0 p-4 sm:p-8 lg:p-10",
            preview &&
              "[&_button]:pointer-events-none [&_button]:opacity-60 [&_form]:pointer-events-none [&_form]:opacity-75 [&_input]:pointer-events-none [&_select]:pointer-events-none [&_textarea]:pointer-events-none",
          )}
        >
          {children}
        </main>
      </div>
      <MobileNavigation />
    </div>
  );
}
