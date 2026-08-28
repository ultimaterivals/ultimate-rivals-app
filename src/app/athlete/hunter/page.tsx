import { Brain, GraduationCap, Target, UsersRound } from "lucide-react";

const tracks = [
  {
    icon: Brain,
    title: "Mentalidade e preparação",
    description:
      "Foco, disciplina, resiliência, preparação mental e hábitos competitivos.",
  },
  {
    icon: Target,
    title: "Inteligência de jogo",
    description:
      "Leitura de jogo, tomada de decisão, análise de cenários e consistência.",
  },
  {
    icon: UsersRound,
    title: "Liderança e equipe",
    description:
      "Comunicação, responsabilidade, comportamento e trabalho em equipe.",
  },
  {
    icon: GraduationCap,
    title: "Evolução contínua",
    description:
      "Aprender, aplicar, revisar e evoluir em ciclos de desenvolvimento.",
  },
] as const;

export default function AthleteHunterPage() {
  return (
    <div className="mx-auto max-w-6xl pb-6">
      <section className="border-ur-gold/20 relative overflow-hidden border-b pt-2 pb-8 sm:pb-10">
        <div
          className="bg-ur-gold/[.07] pointer-events-none absolute top-0 right-0 size-56 rounded-full blur-3xl"
          aria-hidden="true"
        />
        <div className="relative max-w-3xl">
          <div className="mb-5 flex items-center gap-3">
            <span className="border-ur-gold/30 bg-ur-gold/[.06] text-ur-gold grid size-11 place-items-center rounded-full border">
              <GraduationCap size={23} aria-hidden="true" />
            </span>
            <div>
              <p className="text-ur-gold text-[.62rem] font-black tracking-[.22em] uppercase">
                Hunter · Desenvolvimento UR
              </p>
              <p className="mt-1 text-xs font-bold text-zinc-500">
                Escola de desenvolvimento do atleta
              </p>
            </div>
          </div>
          <h1 className="font-display text-4xl leading-[.94] font-black tracking-tight uppercase sm:text-6xl">
            Desenvolvimento para quem quer ir além do jogo.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base sm:leading-7">
            Hunter é uma jornada voluntária de desenvolvimento. Nesta fase do
            aplicativo, a rota apresenta a estrutura da metodologia sem inferir
            adesão, plano, nota, missão ou progresso que ainda não tenham sido
            publicados por uma fonte canônica.
          </p>
        </div>
      </section>

      <section className="py-7 sm:py-9" aria-labelledby="hunter-tracks-title">
        <div className="mb-5">
          <p className="text-[.62rem] font-black tracking-[.2em] text-zinc-600 uppercase">
            Metodologia
          </p>
          <h2
            id="hunter-tracks-title"
            className="font-display mt-2 text-3xl font-black uppercase"
          >
            Quatro trilhas de desenvolvimento
          </h2>
        </div>
        <div className="grid gap-px overflow-hidden rounded-3xl border border-white/[.08] bg-white/[.08] sm:grid-cols-2">
          {tracks.map(({ icon: Icon, title, description }, index) => (
            <article key={title} className="bg-[#090909] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <span className="bg-ur-gold/[.06] text-ur-gold grid size-10 place-items-center rounded-full">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span className="font-display text-3xl font-black text-white/[.06]">
                  0{index + 1}
                </span>
              </div>
              <h3 className="mt-5 text-lg font-black">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-white/[.07] pt-6">
        <p className="text-sm leading-6 text-zinc-500">
          Adesão, plano individual, conteúdos, atividades, avaliações e
          acompanhamento serão conectados no P08 aos contratos canônicos do
          Hunter. Nenhum estado de participação é presumido nesta fundação.
        </p>
      </section>
    </div>
  );
}
