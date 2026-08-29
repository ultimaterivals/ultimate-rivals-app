import {
  BookOpen,
  Brain,
  CheckCircle2,
  Clock3,
  GraduationCap,
  ShieldCheck,
  Target,
  UsersRound,
} from "lucide-react";

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

const pillars = [
  "Disciplina",
  "Leitura de jogo",
  "Tomada de decisão",
  "Consistência",
  "Competitividade",
  "Evolução contínua",
  "Liderança",
  "Equipe",
  "Comportamento",
  "Preparação mental",
] as const;

const participationStates = [
  {
    title: "Não participante",
    description:
      "Conhece a metodologia. A manifestação de interesse só será liberada quando existir contrato seguro de adesão.",
  },
  {
    title: "Interessado",
    description:
      "Acompanha o status da solicitação quando a adesão Hunter estiver conectada a um contrato canônico.",
  },
  {
    title: "Participante",
    description:
      "Vê plano, ciclo, objetivo, prioridades, conteúdos ou atividades publicados e a próxima revisão.",
  },
  {
    title: "Pausado ou concluído",
    description:
      "Mantém o histórico do ciclo e suas evidências publicadas sem apagar o que já aconteceu.",
  },
] as const;

const participantFields = [
  "Plano de desenvolvimento",
  "Ciclo atual",
  "Objetivo publicado",
  "Prioridades",
  "Conteúdos e atividades",
  "Próxima revisão",
] as const;

export default function AthleteHunterPage() {
  return (
    <div className="mx-auto max-w-6xl pb-8">
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
                Hunter · Escola de desenvolvimento UR
              </p>
              <p className="mt-1 text-xs font-bold text-zinc-500">
                Opt-in · separado da participação normal no UR Play
              </p>
            </div>
          </div>
          <h1 className="font-display text-4xl leading-[.94] font-black tracking-tight uppercase sm:text-6xl">
            Desenvolvimento para quem quer ir além do jogo.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base sm:leading-7">
            Hunter é a escola de desenvolvimento do Ultimate Rivals. A jornada é
            voluntária e trabalha preparação, inteligência de jogo, liderança e
            evolução contínua sem criar XP geral, score ou progressão fictícia.
          </p>
        </div>
      </section>

      <section className="py-7 sm:py-9" aria-labelledby="hunter-status-title">
        <div className="border-amber-400/20 bg-amber-400/[.035] rounded-3xl border p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <ShieldCheck
              className="mt-0.5 shrink-0 text-amber-300"
              size={24}
              aria-hidden="true"
            />
            <div>
              <p className="text-xs font-black tracking-[.18em] text-amber-300 uppercase">
                Seu estado Hunter
              </p>
              <h2 id="hunter-status-title" className="mt-2 text-2xl font-black">
                Adesão ainda não conectada ao Athlete App
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                O repositório atual não possui um contrato canônico de adesão,
                LMS ou conteúdo Hunter que permita afirmar se você está
                interessado, participante, pausado ou concluído. Por segurança,
                o App não presume estado e não grava interesse em uma fonte
                provisória.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-8 sm:pb-10" aria-labelledby="hunter-tracks-title">
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

      <section className="border-t border-white/[.07] py-8" aria-labelledby="hunter-pillars-title">
        <div className="max-w-3xl">
          <p className="text-[.62rem] font-black tracking-[.2em] text-zinc-600 uppercase">
            Pilares
          </p>
          <h2
            id="hunter-pillars-title"
            className="font-display mt-2 text-3xl font-black uppercase"
          >
            O que a metodologia desenvolve
          </h2>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {pillars.map((pillar) => (
            <span
              key={pillar}
              className="rounded-full border border-white/[.09] bg-white/[.025] px-3 py-2 text-xs font-black text-zinc-300"
            >
              {pillar}
            </span>
          ))}
        </div>
      </section>

      <section className="border-t border-white/[.07] py-8" aria-labelledby="hunter-journey-title">
        <div className="mb-5 max-w-3xl">
          <p className="text-[.62rem] font-black tracking-[.2em] text-zinc-600 uppercase">
            Jornada opt-in
          </p>
          <h2
            id="hunter-journey-title"
            className="font-display mt-2 text-3xl font-black uppercase"
          >
            Quatro estados, sem progresso inventado
          </h2>
          <p className="mt-3 text-sm leading-6 text-zinc-500">
            Estes são os estados oficiais previstos para o Hunter. O App só
            exibirá um deles como seu estado quando a fonte canônica existir.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {participationStates.map((state, index) => (
            <article
              key={state.title}
              className="rounded-3xl border border-white/[.08] bg-white/[.02] p-5"
            >
              <div className="flex items-center gap-3">
                <span className="bg-ur-gold/[.07] text-ur-gold grid size-8 place-items-center rounded-full text-xs font-black">
                  {index + 1}
                </span>
                <h3 className="font-black">{state.title}</h3>
              </div>
              <p className="mt-3 text-sm leading-6 text-zinc-500">
                {state.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-white/[.07] py-8" aria-labelledby="hunter-plan-title">
        <div className="grid gap-6 lg:grid-cols-[1fr_.9fr]">
          <div>
            <p className="text-[.62rem] font-black tracking-[.2em] text-zinc-600 uppercase">
              Participante
            </p>
            <h2
              id="hunter-plan-title"
              className="font-display mt-2 text-3xl font-black uppercase"
            >
              O plano aparece quando for publicado
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
              Para um atleta participante, a V1 está preparada para apresentar
              somente informações realmente publicadas. Campo ausente permanece
              ausente; nenhuma nota, missão, porcentagem ou recomendação é
              calculada automaticamente.
            </p>
          </div>
          <div className="grid gap-2">
            {participantFields.map((field) => (
              <div
                key={field}
                className="flex items-center gap-3 rounded-2xl border border-white/[.08] px-4 py-3 text-sm font-bold text-zinc-300"
              >
                <CheckCircle2
                  className="text-ur-gold shrink-0"
                  size={16}
                  aria-hidden="true"
                />
                {field}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-3 border-t border-white/[.07] pt-8 md:grid-cols-2">
        <div className="rounded-3xl border border-white/[.08] p-5">
          <BookOpen className="text-ur-gold" size={22} aria-hidden="true" />
          <h2 className="mt-4 text-xl font-black">Conteúdo sem LMS fictício</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Conteúdos e atividades só entram nesta área quando forem publicados
            por uma fonte oficial. Até lá, a metodologia existe sem simular
            aulas concluídas ou porcentagens de curso.
          </p>
        </div>
        <div className="rounded-3xl border border-white/[.08] p-5">
          <Clock3 className="text-ur-gold" size={22} aria-hidden="true" />
          <h2 className="mt-4 text-xl font-black">Ciclo preserva histórico</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Quando houver ciclos Hunter canônicos, pausas e conclusões não
            apagarão evidências já publicadas. Histórico de desenvolvimento
            permanece rastreável.
          </p>
        </div>
      </section>
    </div>
  );
}
