import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  Target,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { Badge, Card, EmptyState } from "@/components/ui";
import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";
import { getAthleteSnapshotForViewer } from "@/server/services/athlete-viewer-snapshot-service";

const pillars = [
  ["Disciplina", "Construir hábitos de preparação, execução e responsabilidade."],
  ["Leitura de jogo", "Perceber contexto, padrões, riscos e oportunidades antes da ação."],
  ["Tomada de decisão", "Escolher melhor sob pressão e aprender com cada cenário competitivo."],
  ["Consistência", "Transformar bons momentos em padrão de comportamento e performance."],
  ["Competitividade", "Competir com intensidade, presença e respeito pelo processo."],
  ["Evolução contínua", "Usar treino, jogo, dados e revisão para avançar de forma consciente."],
  ["Liderança", "Assumir responsabilidade, comunicar e elevar o ambiente ao redor."],
  ["Trabalho em equipe", "Cooperar, confiar, adaptar e competir como unidade."],
  ["Comportamento", "Representar o padrão UR dentro e fora do jogo."],
  ["Preparação mental", "Desenvolver foco, controle emocional, resiliência e prontidão."],
] as const;

const tracks = [
  {
    icon: Brain,
    title: "Mentalidade & preparação",
    description:
      "Foco, disciplina, resiliência, preparação mental e construção de hábitos competitivos.",
  },
  {
    icon: Target,
    title: "Inteligência de jogo",
    description:
      "Leitura de jogo, tomada de decisão, análise de situações e consistência competitiva.",
  },
  {
    icon: UsersRound,
    title: "Liderança & equipe",
    description:
      "Comunicação, responsabilidade, comportamento, trabalho em equipe e influência positiva.",
  },
  {
    icon: GraduationCap,
    title: "Evolução contínua",
    description:
      "Ciclos de aprendizagem, aplicação no UR Play, revisão e próximos objetivos de desenvolvimento.",
  },
] as const;

export default async function AthleteHunterPage() {
  const viewer = await requireAthleteViewer();
  const snapshot = await getAthleteSnapshotForViewer(viewer);

  if (!snapshot.identity) {
    return (
      <EmptyState
        title="Perfil esportivo ainda não vinculado"
        description="O espaço Hunter fica disponível quando sua identidade de atleta estiver vinculada ao App."
      />
    );
  }

  const development = snapshot.development;
  const publishedPlan = Boolean(
    development?.hunterMission ||
      development?.hunterGoal ||
      development?.hunterStatus ||
      development?.priorities.length,
  );

  return (
    <div className="mx-auto grid max-w-6xl gap-7 pb-4">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-ur-gold/35 bg-[radial-gradient(circle_at_top_right,rgba(212,168,59,.18),transparent_42%),linear-gradient(145deg,#17130b_0%,#0a0a0a_48%,#070707_100%)] px-5 py-8 sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full border border-ur-gold/10" />
        <div className="pointer-events-none absolute -right-8 top-8 size-40 rounded-full border border-ur-gold/10" />
        <div className="relative max-w-3xl">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-full border border-ur-gold/40 bg-ur-gold/10 text-ur-gold shadow-[0_0_35px_rgba(212,168,59,.12)]">
              <GraduationCap size={25} aria-hidden="true" />
            </span>
            <div>
              <p className="text-[.65rem] font-black tracking-[.24em] text-ur-gold uppercase">
                Hunter · Desenvolvimento UR
              </p>
              <p className="text-xs font-bold text-zinc-500">Programa opt-in para quem quer evoluir de verdade</p>
            </div>
          </div>

          <h1 className="font-display text-4xl font-black leading-[.92] tracking-tight uppercase sm:text-6xl">
            Não é só jogar melhor.
            <span className="mt-1 block text-ur-gold">É se tornar um atleta melhor.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base sm:leading-7">
            Hunter é a escola de desenvolvimento do Ultimate Rivals para atletas que escolhem entrar em um processo mais profundo de evolução. A metodologia trabalha mentalidade, inteligência de jogo, comportamento, liderança e consistência — conectando aprendizado ao que acontece de verdade em quadra.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="#metodologia"
              className="rounded-ur inline-flex min-h-12 items-center gap-2 bg-ur-gold px-5 text-sm font-black text-ur-black"
            >
              Conhecer a metodologia <ArrowRight size={16} aria-hidden="true" />
            </a>
            <Link
              href="/athlete/feedback"
              className="rounded-ur inline-flex min-h-12 items-center border border-white/15 bg-white/[.03] px-5 text-sm font-black text-white"
            >
              Quero fazer parte
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[1.35rem] border border-white/10 bg-white/[.025] p-4">
          <BookOpen className="text-ur-gold" size={21} aria-hidden="true" />
          <p className="mt-3 text-xs font-black tracking-[.16em] text-zinc-500 uppercase">Aprender</p>
          <p className="mt-1 font-black">Conteúdo com aplicação esportiva</p>
        </div>
        <div className="rounded-[1.35rem] border border-white/10 bg-white/[.025] p-4">
          <ShieldCheck className="text-ur-gold" size={21} aria-hidden="true" />
          <p className="mt-3 text-xs font-black tracking-[.16em] text-zinc-500 uppercase">Aplicar</p>
          <p className="mt-1 font-black">Levar o aprendizado para treino e jogo</p>
        </div>
        <div className="rounded-[1.35rem] border border-white/10 bg-white/[.025] p-4">
          <Sparkles className="text-ur-gold" size={21} aria-hidden="true" />
          <p className="mt-3 text-xs font-black tracking-[.16em] text-zinc-500 uppercase">Evoluir</p>
          <p className="mt-1 font-black">Revisar, ajustar e avançar continuamente</p>
        </div>
      </section>

      {publishedPlan ? (
        <section className="rounded-[1.6rem] border border-ur-gold/30 bg-ur-gold/[.045] p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[.65rem] font-black tracking-[.2em] text-ur-gold uppercase">Seu espaço Hunter</p>
              <h2 className="font-display mt-2 text-3xl font-black uppercase">Plano publicado</h2>
            </div>
            {development?.hunterStatus ? <Badge>{development.hunterStatus}</Badge> : null}
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
            <div className="rounded-ur border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-black tracking-[.16em] text-zinc-500 uppercase">Missão atual</p>
              <p className="mt-2 text-xl font-black">
                {development?.hunterMission ?? "Jornada em acompanhamento"}
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                {development?.hunterGoal ?? development?.goal30Days ?? "Continue aplicando o plano publicado pela operação UR."}
              </p>
            </div>
            <div className="rounded-ur border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-black tracking-[.16em] text-zinc-500 uppercase">Prioridades</p>
              {development?.priorities.length ? (
                <div className="mt-3 grid gap-2">
                  {development.priorities.map((priority) => (
                    <div key={priority} className="flex items-start gap-2 text-sm font-bold text-zinc-300">
                      <CheckCircle2 className="mt-0.5 shrink-0 text-ur-gold" size={15} aria-hidden="true" />
                      {priority}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-zinc-500">Nenhuma prioridade específica publicada.</p>
              )}
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-[1.6rem] border border-white/10 bg-white/[.02] p-5 sm:p-7">
          <p className="text-[.65rem] font-black tracking-[.2em] text-zinc-500 uppercase">Seu espaço Hunter</p>
          <h2 className="font-display mt-2 text-3xl font-black uppercase">Você ainda não possui um plano Hunter publicado.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
            Hunter é uma jornada voluntária e separada da participação normal no UR Play. Você pode competir no Ultimate Rivals sem estar no programa. Quando quiser entrar no processo de desenvolvimento, manifeste seu interesse para a equipe UR.
          </p>
          <Link href="/athlete/feedback" className="mt-5 inline-flex items-center gap-2 font-black text-ur-gold">
            Manifestar interesse <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </section>
      )}

      <section id="metodologia" className="scroll-mt-24">
        <div className="mb-4">
          <p className="text-[.65rem] font-black tracking-[.22em] text-ur-gold uppercase">Metodologia Hunter</p>
          <h2 className="font-display mt-2 text-3xl font-black uppercase sm:text-4xl">Quatro trilhas. Uma evolução completa.</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
            O programa organiza o desenvolvimento em frentes complementares. O conteúdo, as atividades e os acompanhamentos podem evoluir por ciclo sem criar pontuações ou diagnósticos fictícios no App.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {tracks.map(({ icon: Icon, title, description }, index) => (
            <article key={title} className="group rounded-[1.4rem] border border-white/10 bg-gradient-to-br from-white/[.04] to-transparent p-5">
              <div className="flex items-center justify-between gap-4">
                <span className="grid size-10 place-items-center rounded-full border border-ur-gold/25 bg-ur-gold/[.06] text-ur-gold">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span className="font-display text-3xl font-black text-white/[.08]">0{index + 1}</span>
              </div>
              <h3 className="mt-5 text-xl font-black">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4">
          <p className="text-[.65rem] font-black tracking-[.22em] text-zinc-500 uppercase">Pilares de desenvolvimento</p>
          <h2 className="font-display mt-2 text-3xl font-black uppercase">O que um Hunter desenvolve</h2>
        </div>
        <div className="grid gap-px overflow-hidden rounded-[1.4rem] border border-white/10 bg-white/10 sm:grid-cols-2">
          {pillars.map(([title, description]) => (
            <div key={title} className="bg-[#0a0a0a] p-4 sm:p-5">
              <p className="font-black text-white">{title}</p>
              <p className="mt-1 text-sm leading-5 text-zinc-500">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <Card className="border-ur-gold/25 bg-gradient-to-r from-ur-gold/[.07] to-transparent">
        <p className="text-[.65rem] font-black tracking-[.2em] text-ur-gold uppercase">Princípio Hunter</p>
        <h2 className="font-display mt-2 text-3xl font-black uppercase">Aprender. Aplicar. Revisar. Evoluir.</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
          O Hunter não substitui o jogo. Ele usa o jogo como laboratório de desenvolvimento. O UR Play gera experiências e dados; o Hunter transforma essas experiências em aprendizado intencional.
        </p>
      </Card>
    </div>
  );
}
