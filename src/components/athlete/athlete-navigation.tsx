"use client";

import {
  Activity,
  Bell,
  CalendarDays,
  CircleUserRound,
  Clapperboard,
  Coins,
  Compass,
  House,
  ListChecks,
  MapPin,
  Medal,
  ShoppingBag,
  Settings,
  Shield,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const primary = [
  { href: "/athlete", label: "Início", icon: House, exact: true },
  { href: "/athlete/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/athlete/ranking", label: "Ranking", icon: Trophy },
  { href: "/athlete/season", label: "Temporada", icon: Medal },
  { href: "/athlete/profile", label: "Perfil", icon: CircleUserRound },
];

const secondary = [
  { href: "/athlete/ur-play", label: "UR Play", icon: CalendarDays },
  { href: "/athlete/competitions", label: "Competições", icon: Medal },
  { href: "/athlete/performance", label: "Performance", icon: Activity },
  { href: "/athlete/matches", label: "Meus jogos", icon: ListChecks },
  { href: "/athlete/highlights", label: "Destaques", icon: Clapperboard },
  { href: "/athlete/journey", label: "Minha jornada", icon: Compass },
  { href: "/athlete/development", label: "Missões e evolução", icon: Medal },
  { href: "/athlete/arenas", label: "Arenas UR", icon: MapPin },
  { href: "/athlete/market", label: "UR Market", icon: ShoppingBag },
  { href: "/athlete/wallet", label: "Wallet URC", icon: Coins },
  { href: "/athlete/points", label: "Meus pontos", icon: Shield },
  { href: "/athlete/profile", label: "Configurações", icon: Settings },
];

function active(pathname: string, href: string, exact?: boolean) {
  return exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function AthleteDesktopNavigation() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegação do atleta"
      className="hidden space-y-6 px-4 lg:block"
    >
      <div className="space-y-1">
        {primary.map(({ href, label, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            aria-current={active(pathname, href, exact) ? "page" : undefined}
            className={cn(
              "rounded-ur flex min-h-11 cursor-pointer items-center gap-3 px-3 font-bold transition-colors",
              active(pathname, href, exact)
                ? "bg-ur-gold text-ur-black"
                : "text-zinc-300 hover:bg-white/5 hover:text-white",
            )}
          >
            <Icon size={18} aria-hidden="true" />
            {label}
          </Link>
        ))}
      </div>
      <div className="border-t pt-5">
        <p className="mb-2 px-3 text-[.65rem] font-black tracking-[.2em] text-zinc-600 uppercase">
          Jornada e carreira
        </p>
        {secondary.map(({ href, label, icon: Icon }) => (
          <Link
            key={`${href}-${label}`}
            href={href}
            className="rounded-ur flex min-h-11 cursor-pointer items-center gap-3 px-3 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Icon size={17} aria-hidden="true" />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function AthleteMobileNavigation() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegação principal do atleta"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-[#0b0b0b]/[.98] pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {primary.map(({ href, label, icon: Icon, exact }) => {
          const isActive = active(pathname, href, exact);
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1 px-1 text-[.65rem] font-bold transition-colors",
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
  );
}

export function NotificationLink({ count }: { count: number }) {
  return (
    <Link
      href="/athlete/notifications"
      aria-label={`Notificações${count ? `, ${count} não lidas` : ""}`}
      className="relative flex size-11 cursor-pointer items-center justify-center rounded-full border border-zinc-800 bg-zinc-950 text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white"
    >
      <Bell size={20} aria-hidden="true" />
      {count > 0 && (
        <span
          aria-live="polite"
          className="bg-ur-gold text-ur-black absolute -top-1 -right-1 flex min-h-5 min-w-5 items-center justify-center rounded-full px-1 text-[.65rem] font-black"
        >
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
