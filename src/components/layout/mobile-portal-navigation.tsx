"use client";

import { LogOut, Menu, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PortalNavigation, type PortalNavItem } from "./portal-navigation";

export function MobilePortalNavigation({
  items,
  userLabel,
}: {
  items: readonly PortalNavItem[];
  userLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Abrir navegação"
        aria-expanded={open}
        aria-controls="mobile-portal-navigation"
        onClick={() => setOpen(true)}
        className="rounded-ur flex min-h-11 min-w-11 items-center justify-center border bg-white/5 text-zinc-200"
      >
        <Menu size={20} aria-hidden="true" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          onMouseDown={() => setOpen(false)}
        >
          <section
            id="mobile-portal-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navegação"
            className="bg-ur-graphite ml-auto flex h-full w-[min(88vw,22rem)] flex-col border-l p-4 shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between border-b pb-4">
              <div>
                <p className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
                  Navegação
                </p>
                <p className="mt-1 text-sm font-semibold">Ultimate Rivals</p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Fechar navegação"
                onClick={() => setOpen(false)}
                className="rounded-ur flex min-h-11 min-w-11 items-center justify-center border bg-white/5 text-zinc-300"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <PortalNavigation items={items} onNavigate={() => setOpen(false)} />
            </div>

            <div className="mt-5 border-t pt-4">
              <p className="flex items-center gap-2 truncate text-sm text-zinc-300">
                <UserRound size={16} aria-hidden="true" />
                {userLabel}
              </p>
              <form action="/auth/signout" method="post">
                <button className="rounded-ur mt-3 flex min-h-11 w-full items-center gap-2 px-3 text-sm text-zinc-400 hover:bg-white/5 hover:text-white">
                  <LogOut size={16} aria-hidden="true" />
                  Sair
                </button>
              </form>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
