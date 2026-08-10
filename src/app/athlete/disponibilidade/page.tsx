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
        eyebrow="Meu jogo"
        title="Disponibilidade"
        description="Informe quando você normalmente pode jogar ou treinar. O UR usa essas janelas para alinhar atletas, polos e horários sem transformar disponibilidade em reserva."
      />

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
              Disponibilidade atualizada.
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

      <AthleteSourceHealth errors={snapshot.sourceErrors} />
    </div>
  );
}
