import { ArrowUpRight, Clapperboard, Play } from "lucide-react";
import Image from "next/image";

export type MediaFocusItem = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

export function MediaFocusRail({ items }: { items: MediaFocusItem[] }) {
  return (
    <section aria-labelledby="focus-rail-title">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-ur-gold text-xs font-black tracking-[.2em] uppercase">
            Mídia oficial
          </p>
          <h2
            id="focus-rail-title"
            className="font-display mt-1 text-3xl font-black uppercase"
          >
            Momentos em foco
          </h2>
        </div>
        <Clapperboard className="text-ur-gold" aria-hidden="true" />
      </div>

      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
        {items.map((item, index) => (
          <a
            key={item.id}
            href={item.href}
            target="_blank"
            rel="noreferrer"
            className="ur-card-lift rounded-ur group relative min-h-72 w-[82vw] max-w-md shrink-0 snap-center overflow-hidden border border-white/10 bg-zinc-950 p-5 sm:w-96"
          >
            <span className="absolute inset-0 bg-[radial-gradient(circle_at_75%_12%,rgba(244,196,48,.24),transparent_35%)]" />
            <span className="absolute inset-x-5 top-5 flex items-center justify-between">
              <span className="border-ur-gold/30 bg-ur-gold/10 text-ur-gold rounded-full border px-3 py-1 text-[.65rem] font-black tracking-[.15em] uppercase">
                Destaque {String(index + 1).padStart(2, "0")}
              </span>
              <ArrowUpRight
                className="text-zinc-500 transition-colors group-hover:text-white"
                aria-hidden="true"
              />
            </span>
            <span className="absolute inset-0 grid place-items-center opacity-[.07]">
              <Image
                src="/brand/ur-logo-official.png"
                alt=""
                width={180}
                height={180}
                className="size-40 object-contain"
              />
            </span>
            <span className="absolute inset-x-5 bottom-5">
              <span className="bg-ur-gold text-ur-black mb-4 grid size-11 place-items-center rounded-full">
                <Play size={18} fill="currentColor" aria-hidden="true" />
              </span>
              <strong className="font-display block text-2xl font-black uppercase">
                {item.title}
              </strong>
              <span className="mt-1 block text-sm text-zinc-400">
                {item.subtitle}
              </span>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
