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
  Medal,
  ShoppingBag,
  Target,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { stopAthletePreviewAction } from "@/features/admin-athlete-preview/actions";
import { BrandMark } from "@/components/layout/brand-mark";
import { cn } from "@/lib/utils";

const primary = [
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
    href: "/athlete/perfil",
    label: "Perfil",
    icon: CircleUserRound,
    exact: false,
  },
] as const;

const journey = [
  { href: "/athlete/season", label: "Temporada", icon: Medal },
  { href: "/athlete/development", label: "Missões e evolução", icon: Target },
  { href: "/athlete/arenas", label: "Arenas UR", icon: MapPin },
  { href: "/athlete/highlights", label: "Destaques", icon: Clapperboard },
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
  Icon: (typeof primary)[number]["icon"] | (typeof journey)[number]["icon"];
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

function DesktopNavigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="Navegação do atleta" className="hidden px-4 lg:block">
      <div className="space-y-1">
        {primary.map(({ href, label, icon: Icon, exact }) => (
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
          {journey.map(({ href, label, icon: Icon }) => (
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <nav
      aria-label="Navegação principal do atleta"
      className="fixed inset-x-0 bottom-0 border-t border-zinc-800 bg-[#0b0b0b]/[.98] pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      style={{ zIndex: 2147483647, pointerEvents: "auto", isolation: "isolate" }}
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
                "relative z-10 flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[.65rem] font-bold transition-colors",
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
    </nav>,
    document.body,
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
    <div className="min-h-dvh bg-[#080808] text-white lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="bg-ur-graphite hidden min-h-dvh border-r lg:flex lg:flex-col">
        <div className="p-6">
          <BrandMark />
          <span className="mt-3 block text-xs font-bold tracking-wider text-zinc-500 uppercase">
            App do Atleta
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pb-6">
          <DesktopNavigation />
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
      <div className="min-w-0">
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
            "min-w-0 p-4 pb-24 sm:p-8 sm:pb-24 lg:p-10",
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
