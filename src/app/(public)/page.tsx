import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { BrandMark } from "@/components/layout/brand-mark";
import { Badge, Card } from "@/components/ui";

const publicLinks: { href: string; label: string }[] = [
  { href: "/calendar", label: "Calendario" },
  { href: "/rankings", label: "Rankings" },
  { href: "/competitions", label: "Competicoes" },
  { href: "/teams", label: "Equipes" },
];

export default function HomePage() {
  return (
    <main className="min-h-dvh">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <BrandMark />
        <Link
          href="/login"
          className="rounded-ur border-ur-line hover:border-ur-gold inline-flex min-h-11 items-center border px-4 text-sm font-bold tracking-wider uppercase transition-colors"
        >
          Entrar
        </Link>
      </header>
      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[1.4fr_.6fr] lg:items-end lg:py-32">
        <div>
          <Badge>Plataforma oficial</Badge>
          <h1 className="font-display mt-6 max-w-4xl text-5xl leading-[.9] font-black tracking-tight uppercase sm:text-7xl lg:text-8xl">
            A liga continua <span className="text-ur-gold">dentro e fora</span>{" "}
            da quadra.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-zinc-400">
            A fundacao digital do ecossistema Ultimate Rivals conecta agenda,
            rankings, competicoes, equipes e carreira do atleta sem expor dados
            privados.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {publicLinks.map(({ href, label }, index) => (
              <Link
                key={href}
                href={href}
                className={
                  index === 0
                    ? "rounded-ur bg-ur-gold text-ur-black hover:bg-ur-gold-strong inline-flex min-h-12 items-center gap-3 px-6 font-bold tracking-wider uppercase transition-colors"
                    : "rounded-ur border-ur-line hover:border-ur-gold inline-flex min-h-12 items-center gap-3 border px-6 font-bold tracking-wider uppercase transition-colors"
                }
              >
                {label} <ArrowRight size={18} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
        <Card className="border-ur-gold/20">
          <p className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
            Status
          </p>
          <p className="font-display mt-3 text-2xl font-black uppercase">
            Temporada 1 MVP
          </p>
          <div className="bg-ur-line mt-6 h-1 overflow-hidden rounded-full">
            <div className="bg-ur-gold h-full w-11/12" />
          </div>
          <p className="mt-3 text-sm text-zinc-500">
            Experiencia publica, atleta e operacao integradas no DEV
          </p>
        </Card>
      </section>
    </main>
  );
}
