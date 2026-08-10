import type { ReactNode } from "react";
import Link from "next/link";
import { getSessionIdentity } from "@/lib/auth/session";

export default async function AgendaLayout({
  children,
}: {
  children: ReactNode;
}) {
  const identity = await getSessionIdentity();
  const isAdmin = identity?.role === "admin";

  return (
    <div className="grid gap-6">
      <nav
        className="rounded-ur flex flex-wrap gap-2 border p-2"
        aria-label="Navegação da agenda"
      >
        <Link
          href="/admin/agenda"
          className="rounded-ur px-3 py-2 text-sm font-bold text-zinc-400 transition hover:bg-white/5 hover:text-white"
        >
          Agenda
        </Link>
        {isAdmin && (
          <>
            <Link
              href="/admin/agenda/piloto"
              className="bg-ur-gold/10 text-ur-gold rounded-ur hover:bg-ur-gold/15 px-3 py-2 text-sm font-black transition"
            >
              Assistente do piloto
            </Link>
            <Link
              href="/admin/agenda/temporada"
              className="rounded-ur px-3 py-2 text-sm font-bold text-zinc-400 transition hover:bg-white/5 hover:text-white"
            >
              Temporada 13 semanas
            </Link>
            <Link
              href="/admin/agenda/polos"
              className="rounded-ur px-3 py-2 text-sm font-bold text-zinc-400 transition hover:bg-white/5 hover:text-white"
            >
              Polos e infraestrutura
            </Link>
            <Link
              href="/admin/agenda/configuracao"
              className="rounded-ur px-3 py-2 text-sm font-bold text-zinc-400 transition hover:bg-white/5 hover:text-white"
            >
              Setup
            </Link>
            <Link
              href="/admin/agenda/homologacao"
              className="rounded-ur px-3 py-2 text-sm font-bold text-zinc-400 transition hover:bg-white/5 hover:text-white"
            >
              Homologação
            </Link>
            <Link
              href="/admin/agenda/nova-oportunidade"
              className="rounded-ur px-3 py-2 text-sm font-bold text-zinc-400 transition hover:bg-white/5 hover:text-white"
            >
              Nova oportunidade
            </Link>
            <Link
              href="/admin/agenda/confirmacao"
              className="rounded-ur px-3 py-2 text-sm font-bold text-zinc-400 transition hover:bg-white/5 hover:text-white"
            >
              Confirmar sessão
            </Link>
          </>
        )}
      </nav>
      {children}
    </div>
  );
}
