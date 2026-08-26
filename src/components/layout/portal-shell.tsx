import { LogOut, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { BrandMark } from "./brand-mark";
import { MobilePortalNavigation } from "./mobile-portal-navigation";
import { PortalNavigation, type PortalNavItem } from "./portal-navigation";

const athleteNavigation: readonly PortalNavItem[] = [
  {
    key: "athlete-home",
    label: "Visão geral",
    href: "/athlete",
    group: "Portal",
    icon: "dashboard",
  },
];

export function PortalShell({
  portal,
  userLabel,
  navigation,
  children,
}: {
  portal: "Administração" | "Atleta";
  userLabel: string;
  navigation?: readonly PortalNavItem[];
  children: ReactNode;
}) {
  const items = navigation ?? athleteNavigation;

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[18rem_1fr]">
      <aside className="bg-ur-graphite hidden min-h-dvh border-r lg:flex lg:flex-col">
        <div className="p-6">
          <BrandMark context={`Portal ${portal}`} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
          <PortalNavigation items={items} />
        </div>

        <div className="border-t p-4">
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
        <header className="bg-ur-black/95 sticky top-0 z-40 flex min-h-18 items-center justify-between border-b px-5 backdrop-blur lg:hidden">
          <div>
            <BrandMark context={portal} />
          </div>
          <MobilePortalNavigation items={items} userLabel={userLabel} />
        </header>
        <main className="min-w-0 p-5 sm:p-8 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
