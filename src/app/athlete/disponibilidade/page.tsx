import Link from "next/link";
import { AthleteAvailabilityForm } from "@/components/athlete/athlete-availability-form";
import { AthleteSourceHealth } from "@/components/athlete/athlete-source-health";
import { Badge, Card, PageHeader } from "@/components/ui";
import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";
import { getAthleteAvailabilitySnapshot } from "@/server/services/athlete-availability-service";

type Params = Promise<{
  saved?: string | string[];
  deleted?: string | string[];
  error?: string | string[];
}>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const errorMessages: Record<string, string> = {
  invalid: "Não foi possível validar os dados enviados.",
  time: "O horário precisa estar entre 06:00 e 00:00, com o fim após o início.",
  profile: "Seu perfil esportivo ainda não está vinculado à conta.",
  save: "Não foi possível salvar essa disponibilidade.",
  delete: "Não foi possível remover essa disponibilidade.",
};

const weekday = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default async function AthleteAvailabilityPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  const viewer = await requireAthleteViewer();
  const [snapshot, params] = await Promise.all([
    getAthleteAvailabilitySnapshot(
      viewer.isPreview
        ? { athleteId: viewer.athleteId }
        : { userId: viewer.userId },
    ),
    searchParams,
  ]);
  const error = single(params.error);

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Temporada 1 · Meu jogo"
        title="Disponibilidade"
        description="Diga quando você normalmente pode jogar. Este cadastro ajuda o planejamento da operação, mas não cria reserva, não coloca você em lista de espera e não confirma participação."
      />

      <Card className="border-ur-gold/30 bg-ur-gold/[.035]">
        <p className="text-ur-gold text-xs font-black tracking-[.18em] uppercase">
          Sua disponibilidade, do seu ponto de vista
        </p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-black">
              Informe quando você pode jogar
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">
              Disponibilidade é apenas o registro das suas janelas possíveis.
              Ela não é reserva, não consome crédito e não garante encaixe em uma
              atividade. Para jogar, consulte as oportunidades publicadas na
              Agenda e faça as ações disponíveis por lá.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/athlete/agenda"
              className="text-ur-gold inline-flex min-h-11 items-center font-black"
            >
              Ver Agenda →
            </Link>
            <Link
              href="/athlete/season"
              className="inline-flex min-h-11 items-center font-black text-zinc-300"
            >
              Entender a temporada →
            </Link>
          </div>
        </div>
      </Card>

      {viewer.isPreview && (
        <Card className="border-ur-gold/40">
          <p className="text-ur-gold text-sm font-bold">
            Prévia somente leitura: as janelas abaixo refletem o cadastro atual
            do atleta.
          </p>
        </Card>
      )}

      {!viewer.isPreview &&
        (single(params.saved) || single(params.deleted)) && (
          <Card className="border-ur-gold/40">
            <p className="text-ur-gold text-sm font-bold">
              Disponibilidade atualizada. Isso não criou reserva, não consumiu
              crédito e não confirmou participação. Consulte a Agenda para ver
              oportunidades publicadas.
            </p>
          </Card>
        )}

      {!viewer.isPreview && error && (
        <Card className="border-red-500/40">
          <p className="text-sm font-bold text-red-300">
            {errorMessages[error] ?? "Não foi possível concluir a alteração."}
          </p>
        </Card>
      )}

      {!snapshot.athleteId ? (
        <Card>
          <p className="font-bold">Perfil esportivo ainda não vinculado.</p>
          <p className="mt-2 text-sm text-zinc-500">
            A disponibilidade só pode ser registrada depois que sua conta
            estiver ligada ao cadastro oficial de atleta.
          </p>
        </Card>
      ) : viewer.isPreview ? (
        snapshot.windows.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {snapshot.windows.map((window) => (
              <Card key={window.id}>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black">
                    {weekday[window.dayOfWeek] ?? `Dia ${window.dayOfWeek}`}
                  </p>
                  <Badge>{window.modality}</Badge>
                </div>
                <p className="mt-3 text-lg font-black">
                  {window.startsAt.slice(0, 5)}–{window.endsAt.slice(0, 5)}
                </p>
                <p className="mt-2 text-sm text-zinc-500">
                  {window.poleName ?? "Qualquer polo"}
                </p>
                {(window.formatCodes.length > 0 ||
                  window.categoryCodes.length > 0) && (
                  <p className="mt-3 text-xs text-zinc-600">
                    {[...window.formatCodes, ...window.categoryCodes].join(
                      " · ",
                    )}
                  </p>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <p className="text-sm text-zinc-500">
              Nenhuma janela de disponibilidade ativa cadastrada.
            </p>
          </Card>
        )
      ) : (
        <AthleteAvailabilityForm snapshot={snapshot} />
      )}

      <Card>
        <p className="text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
          Como isso se conecta à sua temporada
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            ["1", "Você registra quando normalmente pode jogar"],
            ["2", "O UR usa essas janelas como dado de planejamento operacional"],
            ["3", "Quando uma oportunidade for publicada, ela aparece na Agenda"],
          ].map(([step, label]) => (
            <div key={step} className="rounded-ur border border-white/10 p-4">
              <span className="text-ur-gold font-display text-2xl font-black">
                {step}
              </span>
              <p className="mt-2 text-sm font-bold">{label}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-zinc-500">
          Não existe recomendação automática implícita neste cadastro.
          Demonstrar interesse, entrar em lista de espera e reservar continuam
          sendo ações separadas feitas na Agenda quando a oportunidade permitir.
        </p>
      </Card>

      <AthleteSourceHealth errors={snapshot.sourceErrors} />
    </div>
  );
}
