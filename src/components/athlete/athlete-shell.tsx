"use client";

import {
  CalendarDays,
  CircleUserRound,
  Clapperboard,
  Coins,
  GraduationCap,
  House,
  LogOut,
  MapPin,
  Medal,
  MessageSquareText,
  ShoppingBag,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/layout/brand-mark";
import { stopAthletePreviewAction } from "@/features/admin-athlete-preview/actions";
import { cn } from "@/lib/utils";

type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  special?: boolean;
};

const mobilePrimary: NavigationItem[] = [
  { href: "/athlete", label: "Início", icon: House, exact: true },
  { href: "/athlete/agenda", label: "Jogar", icon: CalendarDays },
  { href: "/athlete/ranking", label: "Ranking", icon: Trophy },
  { href: "/athlete/hunter", label: "Hunter", icon: GraduationCap, special: true },
  { href: "/athlete/perfil", label: "Perfil", icon: CircleUserRound },
];

const desktopPrimary: NavigationItem[] = [
  { href: "/athlete", label: "Início", icon: House, exact: true },
  { href: "/athlete/agenda", label: "Jogar", icon: CalendarDays },
  { href: "/athlete/ranking", label: "Ranking", icon: Trophy },
  { href: "/athlete/season", label: "Temporada", icon: Medal },
  { href: "/athlete/development", label: "Evolução", icon: Target },
  { href: "/athlete/hunter", label: "Hunter", icon: GraduationCap, special: true },
  { href: "/athlete/team", label: "Equipe", icon: Users },
];

const desktopSecondary: NavigationItem[] = [
  { href: "/athlete/results", label: "Resultados", icon: Trophy },
  { href: "/athlete/arenas", label: "Arenas UR", icon: MapPin },
  { href: "/athlete/highlights", label: "Destaques", icon: Clapperboard },
  { href: "/athlete/wallet", label: "Wallet URC", icon: Coins },
  { href: "/athlete/market", label: "UR Market", icon: ShoppingBag },
  { href: "/athlete/perfil", label: "Perfil", icon: CircleUserRound },
  { href: "/athlete/feedback", label: "Feedback", icon: MessageSquareText },
];

const mobileContext: Record<string, NavigationItem[]> = {
  home: [
    { href: "/athlete/season", label: "Temporada", icon: Medal },
    { href: "/athlete/results", label: "Resultados", icon: Trophy },
    { href: "/athlete/development", label: "Evolução", icon: Target },
    { href: "/athlete/team", label: "Equipe", icon: Users },
    { href: "/athlete/highlights", label: "Destaques", icon: Clapperboard },
  ],
  play: [
    { href: "/athlete/disponibilidade", label: "Disponibilidade", icon: CalendarDays },
    { href: "/athlete/arenas", label: "Arenas", icon: MapPin },
    { href: "/athlete/results", label: "Resultados", icon: Trophy },
  ],
  ranking: [
    { href: "/athlete/season", label: "Temporada", icon: Medal },
    { href: "/athlete/results", label: "Resultados", icon: Trophy },
    { href: "/athlete/team", label: "Equipes", icon: Users },
  ],
  hunter: [
    { href: "/athlete/development", label: "Minha evolução", icon: Target },
  ],
  profile: [
    { href: "/athlete/team", label: "Equipe", icon: Users },
    { href: "/athlete/wallet", label: "Wallet", icon: Coins },
    { href: "/athlete/market", label: "Market", icon: ShoppingBag },
    { href: "/athlete/highlights", label: "Destaques", icon: Clapperboard },
    { href: "/athlete/feedback", label: "Feedback", icon: MessageSquareText },
  ],
};

function active(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function currentMobileSection(pathname: string) {
  if (pathname === "/athlete") return "home";
  if (pathname.startsWith("/athlete/agenda") || pathname.startsWith("/athlete/disponibilidade") || pathname.startsWith("/athlete/arenas")) return "play";
  if (pathname.startsWith("/athlete/ranking")) return "ranking";
  if (pathname.startsWith("/athlete/hunter")) return "hunter";
  if (
    pathname.startsWith("/athlete/perfil") ||
    pathname.startsWith("/athlete/wallet") ||
    pathname.startsWith("/athlete/market") ||
    pathname.startsWith("/athlete/feedback") ||
    pathname.startsWith("/athlete/highlights") ||
    pathname.startsWith("/athlete/team")
  ) {
    return "profile";
  }
  return "home";
}

function NavigationLink({ item, pathname }: { item: NavigationItem; pathname: string }) {
  const Icon = item.icon;
  const isActive = active(pathname, item.href, item.exact);

  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ur-gold",
        item.special && "border border-ur-gold/20 bg-ur-gold/[.04]",
        isActive
          ? "bg-ur-gold text-ur-black"
          : item.special
            ? "text-ur-gold hover:bg-ur-gold/10"
            : "text-zinc-300 hover:bg-white/5 hover:text-white",
      )}
    >
      <Icon size={18} aria-hidden="true" />
      <span>{item.label}</span>
      {item.special && !isActive ? (
        <span className="ml-auto text-[.52rem] font-black tracking-[.16em] text-ur-gold/70 uppercase">
          Escola
        </span>
      ) : null}
    </Link>
  );
}

function NavigationSection({ label, items, pathname, preview = false }: { label: string; items: NavigationItem[]; pathname: string; preview?: boolean }) {
  return (
    <section className="mt-6 border-t border-white/[.07] pt-5 first:mt-0 first:border-t-0 first:pt-0">
      <p className="mb-2 px-3 text-[.62rem] font-black tracking-[.2em] text-zinc-600 uppercase">{label}</p>
      <div className="space-y-1">
        {items
          .filter((item) => !preview || item.href !== "/athlete/feedback")
          .map((item) => (
            <NavigationLink key={item.href} item={item} pathname={pathname} />
          ))}
      </div>
    </section>
  );
}

function DesktopNavigation({ preview = false }: { preview?: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navegação do atleta" className="hidden px-4 lg:block">
      <NavigationSection label="Carreira" items={desktopPrimary} pathname={pathname} preview={preview} />
      <NavigationSection label="Ecossistema" items={desktopSecondary} pathname={pathname} preview={preview} />
    </nav>
  );
}

function MobileContextNavigation({ preview = false }: { preview?: boolean }) {
  const pathname = usePathname();
  const section = currentMobileSection(pathname);
  const items = mobileContext[section] ?? [];
  if (!items.length) return null;

  return (
    <nav aria-label="Atalhos da área atual" className="border-b border-white/[.05] bg-[#090909]/92 lg:hidden">
      <div className="flex gap-2 overflow-x-auto px-4 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items
          .filter((item) => !preview || item.href !== "/athlete/feedback")
          .map((item) => {
            const Icon = item.icon;
            const isActive = active(pathname, item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ur-gold",
                  isActive ? "bg-white text-black" : "bg-white/[.05] text-zinc-400 active:bg-white/10 active:text-white",
                )}
              >
                <Icon size={14} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
      </div>
    </nav>
  );
}

function MobileNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal do atleta"
      className="relative z-50 shrink-0 border-t border-white/[.08] bg-[#080808]/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-20px_50px_rgba(0,0,0,.38)] backdrop-blur-xl lg:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 px-1">
        {mobilePrimary.map((item) => {
          const Icon = item.icon;
          const isActive = active(pathname, item.href, item.exact) || (item.href === "/athlete/perfil" && currentMobileSection(pathname) === "profile");
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex min-h-[4.4rem] flex-col items-center justify-center gap-1 px-1 text-[.62rem] font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ur-gold",
                isActive ? "text-ur-gold" : "text-zinc-500 active:text-white",
              )}
            >
              {item.special ? (
                <span
                  className={cn(
                    "grid size-10 place-items-center rounded-full border border-ur-gold/30 bg-gradient-to-b from-ur-gold/10 to-black text-ur-gold shadow-[0_0_24px_rgba(212,168,59,.1)]",
                    isActive && "border-ur-gold bg-ur-gold text-ur-black shadow-[0_0_30px_rgba(212,168,59,.2)]",
                  )}
                >
                  <Icon size={21} strokeWidth={2.3} aria-hidden="true" />
                </span>
              ) : (
                <Icon size={21} strokeWidth={isActive ? 2.5 : 2} aria-hidden="true" />
              )}
              <span>{item.label}</span>
              {isActive && !item.special ? <span className="absolute bottom-1 h-0.5 w-5 rounded-full bg-ur-gold" aria-hidden="true" /> : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function AthleteShell({ userLabel, preview, children }: { userLabel: string; preview?: { publicName: string; athleteCode: string } | null; children: ReactNode }) {
  const previewMode = Boolean(preview);

  return (
    <div className="grid h-dvh grid-rows-[minmax(0,1fr)_auto] overflow-hidden bg-[#070707] text-white lg:h-auto lg:min-h-dvh lg:grid-cols-[16.5rem_1fr] lg:grid-rows-none lg:overflow-visible">
      <aside className="hidden min-h-dvh border-r border-white/[.07] bg-[#0c0c0c] lg:flex lg:flex-col">
        <div className="p-5 pb-4">
          <BrandMark context="App do Atleta" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pb-6">
          <DesktopNavigation preview={previewMode} />
        </div>
        <div className="border-t border-white/[.07] p-4">
          <p className="truncate text-sm font-black text-zinc-200">{userLabel}</p>
          <p className="mt-1 text-[.58rem] font-bold tracking-[.18em] text-zinc-600 uppercase">Sua carreira UR</p>
          {!preview && (
            <form action="/auth/signout" method="post">
              <button className="mt-3 flex min-h-11 w-full items-center gap-2 rounded-2xl px-3 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ur-gold">
                <LogOut size={16} aria-hidden="true" />
                Sair
              </button>
            </form>
          )}
        </div>
      </aside>

      <div className="min-h-0 min-w-0 overflow-y-auto overscroll-y-contain lg:overflow-visible">
        {preview && (
          <div className="sticky top-0 z-[60] flex flex-wrap items-center justify-between gap-3 border-b border-ur-gold/30 bg-[#181407]/95 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-10">
            <div>
              <p className="text-[.62rem] font-black tracking-[.2em] text-ur-gold uppercase">Prévia do Atleta · somente leitura</p>
              <p className="mt-0.5 text-sm font-black">{preview.publicName} · {preview.athleteCode}</p>
            </div>
            <form action={stopAthletePreviewAction}>
              <button className="min-h-10 rounded-xl bg-ur-gold px-4 text-xs font-black text-ur-black uppercase">Voltar ao Command</button>
            </form>
          </div>
        )}

        <header className="sticky top-0 z-40 flex min-h-14 items-center justify-between border-b border-white/[.05] bg-[#070707]/90 px-4 backdrop-blur-xl sm:px-6 lg:min-h-16 lg:px-10">
          <div className="min-w-0 lg:hidden">
            <BrandMark compact />
          </div>
          <div className="min-w-0 text-right lg:ml-auto">
            <p className="truncate text-sm font-black">{userLabel}</p>
            <p className="text-[.56rem] font-bold tracking-[.18em] text-zinc-600 uppercase">Rumo ao estrelato</p>
          </div>
        </header>

        <MobileContextNavigation preview={previewMode} />

        <main
          className={cn(
            "min-w-0 px-4 py-5 sm:px-6 sm:py-7 lg:px-10 lg:py-9",
            preview && "[&_button]:pointer-events-none [&_button]:opacity-60 [&_form]:pointer-events-none [&_form]:opacity-75 [&_input]:pointer-events-none [&_select]:pointer-events-none [&_textarea]:pointer-events-none",
          )}
        >
          {children}
        </main>
      </div>

      <MobileNavigation />
    </div>
  );
}
