import { AthleteAvailabilityForm } from "@/components/athlete/athlete-availability-form";
import { AthleteSourceHealth } from "@/components/athlete/athlete-source-health";
import { Card, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
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

export default async function AthleteAvailabilityPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  const user = await requireRole(["athlete"]);
  const [snapshot, params] = await Promise.all([
    getAthleteAvailabilitySnapshot(user.userId),
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

      {(single(params.saved) || single(params.deleted)) && (
        <Card className="border-ur-gold/40">
          <p className="text-ur-gold text-sm font-bold">
            Disponibilidade atualizada.
          </p>
        </Card>
      )}

      {error && (
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
      ) : (
        <AthleteAvailabilityForm snapshot={snapshot} />
      )}

      <AthleteSourceHealth errors={snapshot.sourceErrors} />
    </div>
  );
}
