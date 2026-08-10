"use client";

import {
  Activity,
  BrainCircuit,
  CalendarDays,
  Handshake,
  LayoutDashboard,
  Network,
  Shield,
  Trophy,
  UsersRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type {
  AdminModuleGroup,
  AdminModuleIcon,
} from "@/lib/auth/admin-modules";
import { cn } from "@/lib/utils";

export type PortalNavItem = {
  key: string;
  label: string;
  href: string;
  group: AdminModuleGroup | "Portal";
  icon: AdminModuleIcon;
};

const iconMap: Record<AdminModuleIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  calendar: CalendarDays,
  athletes: UsersRound,
  teams: Shield,
  "ur-play": Activity,
  competitions: Trophy,
  finance: WalletCards,
  ecosystem: Network,
  commercial: Handshake,
  intelligence: BrainCircuit,
};

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PortalNavigation({
  items,
  onNavigate,
}: {
  items: readonly PortalNavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const groups = Array.from(new Set(items.map((item) => item.group)));

  return (
    <nav aria-label="Navegação principal" className="grid gap-5">
      {groups.map((group) => (
        <div key={group} className="grid gap-1.5">
          <p className="px-3 text-[0.68rem] font-bold tracking-[0.18em] text-zinc-600 uppercase">
            {group}
          </p>
          {items
            .filter((item) => item.group === group)
            .map((item) => {
              const Icon = iconMap[item.icon];
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={onNavigate}
                  className={cn(
                    "rounded-ur flex min-h-11 items-center gap-3 border border-transparent px-3 text-sm font-semibold transition-colors",
                    active
                      ? "border-ur-gold/30 bg-ur-gold text-ur-black shadow-[0_8px_24px_rgba(244,196,48,.12)]"
                      : "text-zinc-400 hover:border-white/5 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>{item.label}</span>
                  {active && <span className="sr-only"> — página atual</span>}
                </Link>
              );
            })}
        </div>
      ))}
    </nav>
  );
}
