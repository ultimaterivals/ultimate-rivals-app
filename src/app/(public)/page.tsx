import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrandMark } from "@/components/layout/brand-mark";
import { Badge, Card } from "@/components/ui";

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
          <Badge>Temporada 1</Badge>
          <h1 className="font-display mt-6 max-w-4xl text-5xl leading-[.9] font-black tracking-tight uppercase sm:text-7xl lg:text-8xl">
            Ultimate Rivals. <span className="text-ur-gold">Eleve o jogo.</span>{" "}
            Supere seus limites.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-zinc-400">
            Competição, evolução e trajetória esportiva em uma única temporada.
          </p>
          <Link
            href="/login"
            className="rounded-ur bg-ur-gold text-ur-black hover:bg-ur-gold-strong mt-8 inline-flex min-h-12 items-center gap-3 px-6 font-bold tracking-wider uppercase transition-colors"
          >
            Entrar no Athlete App <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
        <Card className="border-ur-gold/20">
          <p className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
            A liga continua
          </p>
          <p className="font-display mt-3 text-2xl font-black uppercase">
            Dentro e fora da quadra
          </p>
          <div className="bg-ur-line mt-6 h-1 overflow-hidden rounded-full">
            <div className="bg-ur-gold h-full w-1/4" />
          </div>
          <p className="mt-3 text-sm text-zinc-500">
            Acompanhe sua temporada, seus resultados e sua evolução.
          </p>
        </Card>
      </section>
    </main>
  );
}
