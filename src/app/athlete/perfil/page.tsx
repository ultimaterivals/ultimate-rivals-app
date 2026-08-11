import Link from "next/link";
import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  Coins,
  CreditCard,
  MapPin,
  Shield,
  UserRound,
} from "lucide-react";
import { updateMatchmakingIdentityAction } from "@/app/athlete/perfil/actions";
import { AthleteSourceHealth } from "@/components/athlete/athlete-source-health";
import { Badge, Card, PageHeader } from "@/components/ui";
import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";
import { getAthleteAvailabilitySnapshot } from "@/server/services/athlete-availability-service";
import { getAthleteSnapshotForViewer } from "@/server/services/athlete-viewer-snapshot-service";

type Params = Promise<{
  saved?: string | string[];
  error?: string | string[];
}>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const genderLabels: Record<string, string> = {
  female: "Feminino confirmado",
  male: "Masculino confirmado",
  non_binary: "Não binário",
  undisclosed: "Ainda não confirmado",
};

const errorMessages: Record<string, string> = {
  invalid: "Selecione uma opção válida.",
  save: "Não foi possível atualizar essa informação agora.",
};

function ReadinessItem({
  ready,
  title,
  description,
  action,
}: {
  ready: boolean;
  title: string;
  description: string | undefined;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-ur flex min-w-0 items-start gap-3 overflow-hidden border p-3">
      {ready ? (
        <CheckCircle2
          className="mt-0.5 shrink-0 text-emerald-400"
          size={18}
          aria-hidden="true"
        />
      ) : (
        <CircleAlert
          className="mt-0.5 shrink-0 text-amber-300"
          size={18}
          aria-hidden="true"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="grid min-w-0 gap-1 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
          <p className="min-w-0 break-words text-sm font-bold text-white">
            {title}
          </p>
          <span
            className={`shrink-0 text-[10px] font-black uppercase ${ready ? "text-emerald-300" : "text-amber-300"}`}
          >
            {ready ? "pronto" : "pendente"}
          </span>
        </div>
        <p className="mt-1 min-w-0 break-words text-xs leading-5 text-zinc-500">
          {description}
        </p>
        {action && <div className="mt-2 min-w-0">{action}</div>}
      </div>
    </div>
  );
}

export default async function AthleteProfilePage({
  searchParams,
}: {
  searchParams: Params;
}) {
  const viewer = await requireAthleteViewer();
  const [snapshot, availability, params] = await Promise.all([
    getAthleteSnapshotForViewer(viewer),
    getAthleteAvailabilitySnapshot({
      userId: viewer.isPreview ? null : viewer.userId,
      athleteId: viewer.athleteId,
    }),
    searchParams,
  ]);
  const athlete = snapshot.identity;
  const error = single(params.error);
  const activeAvailability = availability.windows.filter(
    (window) => window.active,
  );

  return (
    <div className="grid min-w-0 gap-8 overflow-x-hidden">
      <PageHeader
        eyebrow="Identidade esportiva"
        title="Meu Perfil"
        description="Dados esportivos e vínculos usados pelo Ultimate Rivals para organizar sua jornada e formar jogos compatíveis."
      />

      {!viewer.isPreview && single(params.saved) && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <p className="text-sm font-bold text-emerald-200">
            Perfil esportivo atualizado.
          </p>
        </Card>
      )}
      {!viewer.isPreview && error && (
        <Card className="border-red-500/30 bg-red-500/5">
          <p className="text-sm font-bold text-red-300">
            {errorMessages[error] ?? "Não foi possível concluir a alteração."}
          </p>
        </Card>
      )}

      {!athlete ? (
        <Card>
          <p className="text-sm text-zinc-400">
            Perfil de atleta ainda não vinculado à conta.
          </p>
        </Card>
      ) : (
        <>
          {(() => {
            const statusReady = athlete.status === "active";
            const poleReady = Boolean(athlete.primaryPoleId);
            const genderReady = ["female", "male"].includes(athlete.gender);
            const availabilityReady = activeAvailability.length > 0;
            const matchmakingReady =
              statusReady && poleReady && genderReady && availabilityReady;

            return (
              <>
                <Card
                  className={
                    matchmakingReady
                      ? "min-w-0 border-emerald-500/30 bg-emerald-500/5"
                      : "min-w-0 border-amber-500/30 bg-amber-500/5"
                  }
                >
                  <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-display break-words text-xl font-black uppercase">
                        {matchmakingReady
                          ? "Pronto para matchmaking"
                          : "Preparação para matchmaking"}
                      </p>
                      <p className="mt-2 max-w-3xl break-words text-sm leading-6 text-zinc-400">
                        O UR só coloca você automaticamente em partidas
                        compatíveis quando cadastro institucional, polo,
                        categoria esportiva e disponibilidade estiverem prontos.
                        Disponibilidade não é reserva.
                      </p>
                    </div>
                    <Badge>{matchmakingReady ? "pronto" : "pendências"}</Badge>
                  </div>

                  <div className="mt-5 grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <ReadinessItem
                      ready={statusReady}
                      title="Cadastro institucional"
                      description={
                        statusReady
                          ? "Cadastro ativo e homologado pela Ultimate Rivals."
                          : `Status atual: ${athlete.status}. A ativação é uma decisão institucional da UR.`
                      }
                    />
                    <ReadinessItem
                      ready={poleReady}
                      title="Polo principal"
                      description={
                        poleReady
                          ? "Polo esportivo oficial vinculado ao seu cadastro."
                          : "A UR ainda precisa homologar seu polo principal."
                      }
                    />
                    <ReadinessItem
                      ready={genderReady}
                      title="Categoria esportiva"
                      description={
                        genderReady
                          ? genderLabels[athlete.gender]
                          : "O motor atual de Masculino, Feminino e Misto precisa de feminino ou masculino confirmado para o pareamento automático."
                      }
                    />
                    <ReadinessItem
                      ready={availabilityReady}
                      title="Disponibilidade exata"
                      description={
                        availabilityReady
                          ? `${activeAvailability.length} janela(s) ativa(s) cadastrada(s).`
                          : "Informe dias e horários reais para o UR encontrar jogos compatíveis."
                      }
                      action={
                        <Link
                          href="/athlete/disponibilidade"
                          className="text-ur-gold inline-flex max-w-full items-center gap-1 break-words text-xs font-bold"
                        >
                          <Clock3 size={13} className="shrink-0" aria-hidden="true" />
                          {availabilityReady
                            ? "Revisar horários"
                            : "Configurar horários"}
                        </Link>
                      }
                    />
                  </div>
                </Card>

                <div className="grid min-w-0 gap-4 lg:grid-cols-[1.2fr_.8fr]">
                  <Card className="min-w-0">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="shrink-0 rounded-full border bg-white/5 p-4">
                        <UserRound
                          className="text-ur-gold"
                          size={28}
                          aria-hidden="true"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-display break-words text-2xl font-black uppercase">
                          {athlete.publicName}
                        </p>
                        <p className="mt-1 break-words text-sm text-zinc-500">
                          {athlete.athleteCode}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge>{athlete.status}</Badge>
                          {snapshot.summary?.level && (
                            <Badge>{snapshot.summary.level}</Badge>
                          )}
                          <Badge>
                            {genderLabels[athlete.gender] ?? athlete.gender}
                          </Badge>
                        </div>
                        {athlete.bio && (
                          <p className="mt-4 max-w-2xl break-words text-sm leading-6 text-zinc-400">
                            {athlete.bio}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-6 flex min-w-0 flex-wrap gap-4 border-t pt-4 text-sm text-zinc-500">
                      {(athlete.city || athlete.state) && (
                        <span className="flex min-w-0 items-center gap-2 break-words">
                          <MapPin size={15} className="shrink-0" aria-hidden="true" />
                          {[athlete.city, athlete.state]
                            .filter(Boolean)
                            .join(" / ")}
                        </span>
                      )}
                      {athlete.instagramHandle && (
                        <span className="min-w-0 break-all">
                          @{athlete.instagramHandle}
                        </span>
                      )}
                    </div>
                  </Card>

                  <Card className="min-w-0">
                    <p className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
                      Vínculo esportivo
                    </p>
                    <div className="mt-4 grid min-w-0 gap-3">
                      {snapshot.teams && snapshot.teams.length > 0 ? (
                        snapshot.teams.map((team) => (
                          <div
                            key={team.id}
                            className="rounded-ur flex min-w-0 items-center gap-3 border p-3"
                          >
                            <Shield
                              className="text-ur-gold shrink-0"
                              size={18}
                              aria-hidden="true"
                            />
                            <div className="min-w-0">
                              <p className="break-words font-bold">{team.name}</p>
                              <p className="text-xs text-zinc-500">
                                Equipe Oficial
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-zinc-400">
                          Atleta livre · disponível para formação e equipes.
                        </p>
                      )}
                    </div>
                  </Card>
                </div>

                <Card className="min-w-0">
                  <p className="font-display text-lg font-black uppercase">
                    Informação usada nas categorias
                  </p>
                  <p className="mt-2 max-w-3xl break-words text-sm leading-6 text-zinc-500">
                    Esta informação é escolhida por você. O Ultimate Rivals não
                    infere categoria pelo seu nome, equipe ou inscrição antiga.
                    No motor competitivo atual, feminino e masculino confirmados
                    permitem o encaixe automático em Feminino, Masculino e
                    Misto. Outras opções são preservadas no cadastro e exigem
                    revisão operacional antes de uma competição por categoria.
                  </p>
                  {!viewer.isPreview ? (
                    <form
                      action={updateMatchmakingIdentityAction}
                      className="mt-5 grid min-w-0 gap-3 md:grid-cols-[1fr_auto] md:items-end"
                    >
                      <label className="grid min-w-0 gap-1 text-xs font-bold text-zinc-500 uppercase">
                        Como você deseja registrar essa informação?
                        <select
                          name="gender"
                          defaultValue={athlete.gender}
                          required
                          className="rounded-ur min-w-0 w-full max-w-full border bg-black/30 px-3 py-3 text-sm text-white"
                        >
                          <option value="female">Feminino</option>
                          <option value="male">Masculino</option>
                          <option value="non_binary">Não binário</option>
                          <option value="undisclosed">
                            Prefiro não informar / ainda não confirmado
                          </option>
                        </select>
                      </label>
                      <button
                        type="submit"
                        className="bg-ur-gold rounded-ur max-w-full px-5 py-3 text-sm font-black break-words text-black uppercase"
                      >
                        Salvar no perfil
                      </button>
                    </form>
                  ) : (
                    <p className="mt-5 text-sm font-bold text-zinc-500">
                      Prévia somente leitura · a categoria esportiva só pode ser
                      alterada pelo próprio atleta.
                    </p>
                  )}
                </Card>

                <div className="grid min-w-0 gap-4 md:grid-cols-2">
                  <Card className="min-w-0">
                    <p className="flex items-center gap-2 font-bold">
                      <CreditCard
                        className="text-ur-gold"
                        size={17}
                        aria-hidden="true"
                      />{" "}
                      Pacotes ativos
                    </p>
                    <div className="mt-4 grid min-w-0 gap-3">
                      {snapshot.packages && snapshot.packages.length > 0 ? (
                        snapshot.packages.map((item) => (
                          <div
                            key={item.id}
                            className="flex min-w-0 items-center justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0"
                          >
                            <div className="min-w-0">
                              <p className="break-words text-sm font-bold">
                                {item.name}
                              </p>
                              <p className="break-words text-xs text-zinc-600">
                                {item.code}
                              </p>
                            </div>
                            <p className="font-display shrink-0 text-xl font-black">
                              {item.unitsRemaining === null
                                ? "—"
                                : item.unitsRemaining}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-zinc-500">
                          Nenhum pacote ativo.
                        </p>
                      )}
                    </div>
                  </Card>
                  <Card className="min-w-0">
                    <p className="flex items-center gap-2 font-bold">
                      <Coins
                        className="text-ur-gold"
                        size={17}
                        aria-hidden="true"
                      />{" "}
                      Economia UR
                    </p>
                    <div className="mt-5 grid grid-cols-2 gap-4">
                      <div className="min-w-0">
                        <p className="text-xs text-zinc-500 uppercase">
                          UR Coins
                        </p>
                        <p className="font-display mt-1 text-3xl font-black">
                          {snapshot.summary?.urCoinBalance ?? "—"}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-zinc-500 uppercase">
                          Créditos
                        </p>
                        <p className="font-display mt-1 text-3xl font-black">
                          {snapshot.creditBalance ?? "—"}
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              </>
            );
          })()}
        </>
      )}

      <AthleteSourceHealth
        errors={[...snapshot.sourceErrors, ...availability.sourceErrors]}
      />
    </div>
  );
}
