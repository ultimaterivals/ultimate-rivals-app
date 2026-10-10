import {
  BookOpen,
  Brain,
  Clock3,
  GraduationCap,
  ShieldCheck,
  Target,
  UsersRound,
} from "lucide-react";
import { registerHunterInterestAction } from "@/app/athlete/hunter/actions";
import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";
import { createClient } from "@/lib/supabase/server";

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
      "Conhece a metodologia e pode manifestar interesse quando quiser.",
  },
  {
    title: "Interessado",
    description:
      "Seu interesse foi registrado; a equipe UR ainda não confirmou a entrada no programa.",
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

function missionDetails(
  value:
    | { title: string; description: string }
    | { title: string; description: string }[]
    | null,
) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function AthleteHunterPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const viewer = await requireAthleteViewer();
  const client = await createClient();
  const [interestResult, progressResult, params] = await Promise.all([
    client
      .from("athlete_hunter_interests")
      .select("created_at")
      .eq("athlete_id", viewer.athleteId)
      .maybeSingle(),
    client
      .from("athlete_hunter_progress")
      .select("id,status,hunter_missions!inner(title,description)")
      .eq("athlete_id", viewer.athleteId)
      .order("updated_at", { ascending: false }),
    searchParams,
  ]);
  const interest = interestResult.data;
  const interestError = interestResult.error;
  const missions = progressResult.data ?? [];
  const hasPublishedMissions = missions.length > 0;
  const statusUnavailable = Boolean(interestError || progressResult.error);

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
        <div className="rounded-3xl border border-amber-400/20 bg-amber-400/[.035] p-5 sm:p-6">
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
                {statusUnavailable
                  ? "Estado Hunter indisponível"
                  : hasPublishedMissions
                    ? "Missões Hunter registradas"
                    : interest
                      ? "Interesse registrado"
                      : "Conheça o Hunter e manifeste seu interesse"}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                {statusUnavailable
                  ? "Não foi possível consultar seu interesse agora. Tente novamente mais tarde."
                  : hasPublishedMissions
                    ? "Sua equipe de desenvolvimento atribuiu missões ao seu perfil. Consulte abaixo as informações publicadas."
                    : interest
                      ? "Seu interesse está registrado. Isso não confirma a entrada no programa; a equipe UR conduzirá as próximas etapas."
                      : "A participação é voluntária. Registrar interesse não garante uma vaga nem cria um plano de desenvolvimento."}
              </p>
              {params.saved === "1" && interest && (
                <p
                  className="mt-3 text-sm font-bold text-emerald-300"
                  role="status"
                >
                  Seu interesse foi recebido.
                </p>
              )}
              {params.error === "save" && (
                <p className="mt-3 text-sm font-bold text-red-300" role="alert">
                  Não foi possível registrar o interesse. Tente novamente.
                </p>
              )}
              {!viewer.isPreview &&
                !statusUnavailable &&
                !interest &&
                !hasPublishedMissions && (
                  <form action={registerHunterInterestAction} className="mt-5">
                    <button
                      type="submit"
                      className="bg-ur-gold text-ur-black focus-visible:ring-ur-gold min-h-11 rounded-xl px-5 py-2 text-sm font-black focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                    >
                      Tenho interesse no Hunter
                    </button>
                  </form>
                )}
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

      <section
        className="border-t border-white/[.07] py-8"
        aria-labelledby="hunter-pillars-title"
      >
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

      <section
        className="border-t border-white/[.07] py-8"
        aria-labelledby="hunter-journey-title"
      >
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
            Estes são os estados da jornada Hunter. Interesse registrado ainda
            não significa participação; a equipe UR confirma cada etapa.
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

      <section
        className="border-t border-white/[.07] py-8"
        aria-labelledby="hunter-plan-title"
      >
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
              Atribuições oficiais aparecem aqui quando publicadas. Campo
              ausente permanece ausente; nenhuma nota, porcentagem ou
              recomendação é calculada automaticamente.
            </p>
          </div>
          <div className="grid gap-2" aria-live="polite">
            {progressResult.error ? (
              <p className="text-sm text-amber-300">
                Não foi possível consultar suas missões agora.
              </p>
            ) : missions.length === 0 ? (
              <p className="text-sm text-zinc-400">
                Nenhuma missão Hunter foi atribuída ao seu perfil.
              </p>
            ) : (
              missions.map((mission) => {
                const details = missionDetails(mission.hunter_missions);
                return (
                  <div
                    key={mission.id}
                    className="rounded-2xl border border-white/[.08] px-4 py-3"
                  >
                    <p className="flex items-center gap-3 text-sm font-bold text-zinc-200">
                      <Target
                        className="text-ur-gold shrink-0"
                        size={16}
                        aria-hidden="true"
                      />
                      {details?.title ?? "Missão sem título publicado"}
                    </p>
                    {details?.description && (
                      <p className="mt-2 text-sm leading-6 text-zinc-400">
                        {details.description}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-zinc-500">
                      {mission.status === "in_progress"
                        ? "Em andamento"
                        : mission.status === "completed"
                          ? "Concluída"
                          : mission.status === "not_completed"
                            ? "Não concluída"
                            : "Atribuída"}
                    </p>
                  </div>
                );
              })
            )}
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
            Quando houver ciclos Hunter publicados, pausas e conclusões não
            apagarão evidências já registradas. Histórico de desenvolvimento
            permanece rastreável.
          </p>
        </div>
      </section>
    </div>
  );
}
