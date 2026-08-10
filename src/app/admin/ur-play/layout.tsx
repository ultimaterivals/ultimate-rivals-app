import type { ReactNode } from "react";
import Link from "next/link";

export default function UrPlayLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-6">
      <nav
        className="rounded-ur flex flex-wrap gap-2 border p-2"
        aria-label="Navegação UR Play"
      >
        <Link
          href="/admin/ur-play"
          className="rounded-ur px-3 py-2 text-sm font-bold text-zinc-400 transition hover:bg-white/5 hover:text-white"
        >
          Visão geral
        </Link>
        <Link
          href="/admin/ur-play/presenca"
          className="rounded-ur px-3 py-2 text-sm font-bold text-zinc-400 transition hover:bg-white/5 hover:text-white"
        >
          Presença
        </Link>
      </nav>
      {children}
    </div>
  );
}
