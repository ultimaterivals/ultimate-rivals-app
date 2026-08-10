import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  MapPin,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { updateUrPlayPreflightCheckAction } from "@/app/admin/ur-play/preflight/actions";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { requireAdminModule } from "@/lib/auth/admin-module-access";
import { getAdminUrPlayPreflightSnapshot } from "@/server/services/admin-ur-play-preflight-service";

type Params = Promise<{
  session?: string | string[];
  success?: string | string[];
  error?: string | string[];
}>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

const errorMessages: Record<string, string> = {
  invalid_request: "Revise o item e a observação antes de salvar.",
  auth_required: "A sessão autenticada não foi encontrada.",
  operation_denied:
    "Seu perfil não está autorizado a operar o preflight desta sessão.",
  session_not_found: "A sessão não existe mais.",
  invalid_key: "Item de preflight inválido.",
  note_too_long: "A observação ultrapassa o limite permitido.",
  operation_failed: "A atualização foi bloqueada e nada foi alterado.",
};

export default async function UrPlayPreflightPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  await requireAdminModule("urPlay");
  const [snapshot, params] = await Promise.all([
    getAdminUrPlayPreflightSnapshot(),
    searchParams,
  ]);
  const requestedSession = single(params.session);
  const success = single(params.success);
  const error = single(params.error);
  const session =
    snapshot.sessions.find((item) => item.id === requestedSession) ??
    snapshot.currentSession;

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="UR Play · Pré-operação"
        title="Preflight da sessão"
        description="Gate final antes de levar a operação para a quadra. O sistema confere o que consegue medir e exige confirmação humana para o que depende de execução física."
        action={
          session?.status === "in_progress" ? (
            <Link
              href="/admin/ur-play/quadra"
              className="bg-ur-gold text-ur-black rounded-ur inline-flex min-h-11 items-center gap-2 px-4 text-sm font-black"
            >
              Operação de quadra <ArrowRight size={16} aria-hidden="true" />
            </Link>
          ) : (
            <Badge>{session?.ready ? "GO operacional" : "Pré-operação"}</Badge>
          )
        }
      />

      {success === "check_updated" && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <p className="text-sm font-bold text-emerald-200">
            Item atualizado com trilha de auditoria.
          </p>
        </Card>
      )}
      {error && (
        <Card className="border-red-500/30 bg-red-500/5">
          <p className="text-sm font-bold text-red-200">
            {errorMessages[error] ?? errorMessages.operation_failed}
          </p>
        </Card>
      )}

      {snapshot.sessions.length === 0 ? (
        <Card>
          <div className="flex items-start gap-3">
            <CircleAlert
              className="text-ur-gold mt-0.5"
              size={20}
              aria-hidden="true"
            />
            <div>
              <p className="font-bold">Nenhuma sessão disponível para preflight.</p>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                O preflight nasce somente depois que uma oportunidade vira UR
                Play oficial com temporada, local e quadra vinculados.
              </p>
              <Link
                href="/admin/agenda/piloto"
                className="text-ur-gold mt-4 inline-flex text-sm font-bold"
              >
                Abrir Assistente do Piloto →
              </Link>
            </div>
          </div>
        </Card>
      ) : (
        <>
          {snapshot.sessions.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {snapshot.sessions.map((item) => (
                <Link
                  key={item.id}
                  href={`/admin/ur-play/preflight?session=${item.id}`}
                  className={`rounded-ur border px-3 py-2 text-xs font-bold ${session?.id === item.id ? "border-ur-gold text-ur-gold" : "text-zinc-500"}`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          )}

          {session && (
            <>
              <Card
                className={
                  session.ready
                    ? "border-emerald-500/35 bg-emerald-500/5"
                    : "border-ur-gold/25"
                }
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      {session.ready ? (
                        <CheckCircle2
                          className="text-emerald-400"
                          size={20}
                          aria-hidden="true"
                        />
                      ) : (
                        <ClipboardCheck
                          className="text-ur-gold"
                          size={20}
                          aria-hidden="true"
                        />
                      )}
                      <p className="font-display text-2xl font-black uppercase">
                        {session.name}
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-zinc-500">
                      {dateFormatter.format(new Date(session.startsAt))} ·{" "}
                      {session.poleName} · {session.venueName}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge>{session.ready ? "GO" : "NO-GO"}</Badge>
                    <p className="mt-2 text-xs text-zinc-500">
                      {session.criticalReady}/{session.criticalTotal} críticos
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <div className="rounded-ur border p-3">
                    <p className="text-[10px] font-bold text-zinc-600 uppercase">
                      Confirmados
                    </p>
                    <p className="font-display mt-2 text-2xl font-black">
                      {session.confirmedRegistrations}
                    </p>
                  </div>
                  <div className="rounded-ur border p-3">
                    <p className="text-[10px] font-bold text-zinc-600 uppercase">
                      Mínimo de jogo
                    </p>
                    <p className="font-display mt-2 text-2xl font-black">
                      {session.minimumAthletes || "—"}
                    </p>
                  </div>
                  <div className="rounded-ur border p-3">
                    <p className="text-[10px] font-bold text-zinc-600 uppercase">
                      Check-ins
                    </p>
                    <p className="font-display mt-2 text-2xl font-black">
                      {session.checkedIn}
                    </p>
                  </div>
                  <div className="rounded-ur border p-3">
                    <p className="text-[10px] font-bold text-zinc-600 uppercase">
                      Staff atribuído
                    </p>
                    <p className="font-display mt-2 text-2xl font-black">
                      {session.staffAssigned}
                    </p>
                  </div>
                  <div className="rounded-ur border p-3">
                    <p className="text-[10px] font-bold text-zinc-600 uppercase">
                      Quadras
                    </p>
                    <p className="font-display mt-2 text-2xl font-black">
                      {session.courts}
                    </p>
                  </div>
                </div>
              </Card>

              <section className="grid gap-4">
                <div>
                  <h2 className="font-display text-xl font-black uppercase">
                    Gates automáticos
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Estes itens vêm do banco e não podem ser marcados manualmente.
                  </p>
                </div>
                <div className="grid gap-3 lg:grid-cols-3">
                  {session.automaticGates.map((gate) => (
                    <Card
                      key={gate.key}
                      className={
                        gate.ready
                          ? "border-emerald-500/25 bg-emerald-500/5"
                          : "border-red-500/25 bg-red-500/5"
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold">{gate.label}</p>
                          <p className="mt-2 text-sm leading-6 text-zinc-500">
                            {gate.detail}
                          </p>
                        </div>
                        {gate.ready ? (
                          <CheckCircle2
                            className="shrink-0 text-emerald-400"
                            size={18}
                            aria-hidden="true"
                          />
                        ) : (
                          <CircleAlert
                            className="shrink-0 text-red-300"
                            size={18}
                            aria-hidden="true"
                          />
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </section>

              <section className="grid gap-4">
                <div>
                  <h2 className="font-display text-xl font-black uppercase">
                    Checklist crítico
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Todos precisam estar concluídos para liberar o GO operacional.
                  </p>
                </div>
                <div className="grid gap-3 xl:grid-cols-2">
                  {session.checks
                    .filter((check) => check.critical)
                    .map((check) => (
                      <Card
                        key={check.key}
                        className={
                          check.checked
                            ? "border-emerald-500/25 bg-emerald-500/5"
                            : undefined
                        }
                      >
                        <form
                          action={updateUrPlayPreflightCheckAction}
                          className="grid gap-4"
                        >
                          <input
                            type="hidden"
                            name="sessionId"
                            value={session.id}
                          />
                          <input
                            type="hidden"
                            name="checkKey"
                            value={check.key}
                          />
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-bold">{check.label}</p>
                              <p className="mt-1 text-sm leading-6 text-zinc-500">
                                {check.description}
                              </p>
                            </div>
                            {check.checked ? (
                              <CheckCircle2
                                className="shrink-0 text-emerald-400"
                                size={18}
                                aria-hidden="true"
                              />
                            ) : (
                              <ShieldCheck
                                className="text-ur-gold shrink-0"
                                size={18}
                                aria-hidden="true"
                              />
                            )}
                          </div>
                          <label className="grid gap-2 text-xs font-bold text-zinc-500 uppercase">
                            Observação opcional
                            <textarea
                              name="note"
                              defaultValue={check.note ?? ""}
                              maxLength={500}
                              rows={2}
                              className="rounded-ur border bg-black/25 px-3 py-2 text-sm font-normal text-white normal-case"
                            />
                          </label>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="submit"
                              name="checked"
                              value="true"
                            >
                              {check.checked ? "Salvar observação" : "Concluir item"}
                            </Button>
                            {check.checked && (
                              <Button
                                type="submit"
                                name="checked"
                                value="false"
                                variant="secondary"
                              >
                                Reabrir
                              </Button>
                            )}
                          </div>
                        </form>
                      </Card>
                    ))}
                </div>
              </section>

              <section className="grid gap-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-black uppercase">
                      Suporte operacional
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500">
                      Recomendados para elevar a experiência, mas não bloqueiam o
                      GO esportivo.
                    </p>
                  </div>
                  <Badge>
                    {session.supportReady}/{session.supportTotal} concluídos
                  </Badge>
                </div>
                <div className="grid gap-3 lg:grid-cols-3">
                  {session.checks
                    .filter((check) => !check.critical)
                    .map((check) => (
                      <Card key={check.key}>
                        <form
                          action={updateUrPlayPreflightCheckAction}
                          className="grid gap-3"
                        >
                          <input
                            type="hidden"
                            name="sessionId"
                            value={session.id}
                          />
                          <input
                            type="hidden"
                            name="checkKey"
                            value={check.key}
                          />
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-bold">{check.label}</p>
                              <p className="mt-1 text-xs leading-5 text-zinc-500">
                                {check.description}
                              </p>
                            </div>
                            {check.checked && (
                              <CheckCircle2
                                className="shrink-0 text-emerald-400"
                                size={16}
                                aria-hidden="true"
                              />
                            )}
                          </div>
                          <textarea
                            name="note"
                            defaultValue={check.note ?? ""}
                            maxLength={500}
                            rows={2}
                            aria-label={`Observação: ${check.label}`}
                            className="rounded-ur border bg-black/25 px-3 py-2 text-sm text-white"
                          />
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="submit"
                              name="checked"
                              value="true"
                            >
                              {check.checked ? "Salvar" : "Concluir"}
                            </Button>
                            {check.checked && (
                              <Button
                                type="submit"
                                name="checked"
                                value="false"
                                variant="secondary"
                              >
                                Reabrir
                              </Button>
                            )}
                          </div>
                        </form>
                      </Card>
                    ))}
                </div>
              </section>

              <Card
                className={
                  session.ready
                    ? "border-emerald-500/35 bg-emerald-500/5"
                    : "border-red-500/25 bg-red-500/5"
                }
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {session.ready ? (
                      <CheckCircle2
                        className="mt-0.5 text-emerald-400"
                        size={20}
                        aria-hidden="true"
                      />
                    ) : (
                      <CircleAlert
                        className="mt-0.5 text-red-300"
                        size={20}
                        aria-hidden="true"
                      />
                    )}
                    <div>
                      <p className="font-display text-xl font-black uppercase">
                        {session.ready
                          ? "Preflight aprovado"
                          : "Preflight ainda bloqueado"}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">
                        {session.ready
                          ? "Os gates automáticos e todos os itens críticos estão prontos para a sessão."
                          : "Resolva os gates vermelhos e conclua o checklist crítico antes da operação."}
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/admin/ur-play/quadra"
                    aria-disabled={!session.ready}
                    className={`rounded-ur inline-flex min-h-11 items-center gap-2 px-4 text-sm font-black ${session.ready ? "bg-ur-gold text-ur-black" : "pointer-events-none border text-zinc-600"}`}
                  >
                    Abrir operação de quadra
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </div>
              </Card>
            </>
          )}
        </>
      )}

      {snapshot.sourceErrors.length > 0 && (
        <Card className="border-red-500/30">
          <p className="font-bold text-red-200">Leitura parcial do preflight</p>
          <ul className="mt-2 grid gap-1 text-sm text-zinc-500">
            {snapshot.sourceErrors.map((sourceError) => (
              <li key={sourceError}>{sourceError}</li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="border-ur-gold/20">
        <div className="flex items-start gap-3">
          <MapPin
            className="text-ur-gold mt-0.5"
            size={18}
            aria-hidden="true"
          />
          <div>
            <p className="font-bold">O preflight não substitui presença.</p>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              Confirmação prévia indica que a operação está preparada. No local,
              check-in e presença real continuam sendo registrados no módulo de
              Presença antes do matchmaking.
            </p>
            <p className="mt-2 flex items-center gap-2 text-xs text-zinc-600">
              <UsersRound size={14} aria-hidden="true" /> Dados humanos e dados
              operacionais permanecem separados para preservar auditoria.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
