import type { ReactNode } from "react";
import Link from "next/link";

export default function AthletesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-6">
      <nav
        className="rounded-ur flex flex-wrap gap-2 border p-2"
        aria-label="Navegação de atletas"
      >
        <Link
          href="/admin/atletas"
          className="rounded-ur px-3 py-2 text-sm font-bold text-zinc-400 transition hover:bg-white/5 hover:text-white"
        >
          Visão geral
        </Link>
        <Link
          href="/admin/atletas/importacao"
          className="rounded-ur px-3 py-2 text-sm font-bold text-zinc-400 transition hover:bg-white/5 hover:text-white"
        >
          Importação
        </Link>
        <Link
          href="/admin/atletas/homologacao"
          className="rounded-ur px-3 py-2 text-sm font-bold text-zinc-400 transition hover:bg-white/5 hover:text-white"
        >
          Homologação
        </Link>
        <Link
          href="/admin/atletas/acessos"
          className="rounded-ur px-3 py-2 text-sm font-bold text-zinc-400 transition hover:bg-white/5 hover:text-white"
        >
          Primeiro acesso
        </Link>
        <Link
          href="/admin/atletas/ondas"
          className="rounded-ur px-3 py-2 text-sm font-bold text-zinc-400 transition hover:bg-white/5 hover:text-white"
        >
          Ondas de ativação
        </Link>
      </nav>
      {children}
    </div>
  );
}
