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
          href="/admin/ur-play/preflight"
          className="bg-ur-gold/10 text-ur-gold rounded-ur px-3 py-2 text-sm font-black transition hover:bg-ur-gold/15"
        >
          Preflight
        </Link>
        <Link
          href="/admin/ur-play/presenca"
          className="rounded-ur px-3 py-2 text-sm font-bold text-zinc-400 transition hover:bg-white/5 hover:text-white"
        >
          Presença
        </Link>
        <Link
          href="/admin/ur-play/quadra"
          className="rounded-ur px-3 py-2 text-sm font-bold text-zinc-400 transition hover:bg-white/5 hover:text-white"
        >
          Operação de quadra
        </Link>
        <Link
          href="/admin/ur-play/fechamento"
          className="rounded-ur px-3 py-2 text-sm font-bold text-zinc-400 transition hover:bg-white/5 hover:text-white"
        >
          Fechamento esportivo
        </Link>
        <Link
          href="/admin/ur-play/pos-sessao"
          className="rounded-ur px-3 py-2 text-sm font-bold text-zinc-400 transition hover:bg-white/5 hover:text-white"
        >
          Pós-Sessão 360
        </Link>
        <Link
          href="/admin/ur-play/retencao"
          className="rounded-ur px-3 py-2 text-sm font-bold text-zinc-400 transition hover:bg-white/5 hover:text-white"
        >
          Retenção 1º → 2º jogo
        </Link>
      </nav>
      {children}
    </div>
  );
}
