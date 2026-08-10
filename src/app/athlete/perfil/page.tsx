import { Coins, CreditCard, MapPin, Shield, UserRound } from "lucide-react";
import { AthleteSourceHealth } from "@/components/athlete/athlete-source-health";
import { Badge, Card, PageHeader } from "@/components/ui";
import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";
import { getAthleteSnapshotForViewer } from "@/server/services/athlete-viewer-snapshot-service";

export default async function AthleteProfilePage() {
  const viewer = await requireAthleteViewer();
  const snapshot = await getAthleteSnapshotForViewer(viewer);
  const athlete = snapshot.identity;

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Identidade esportiva"
        title="Meu Perfil"
        description="Dados esportivos e vínculos usados pelo Ultimate Rivals para organizar sua jornada."
      />

      {!athlete ? (
        <Card>
          <p className="text-sm text-zinc-400">
            Perfil de atleta ainda não vinculado à conta.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
            <Card>
              <div className="flex items-start gap-4">
                <div className="rounded-full border bg-white/5 p-4">
                  <UserRound
                    className="text-ur-gold"
                    size={28}
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <p className="font-display text-2xl font-black uppercase">
                    {athlete.publicName}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {athlete.athleteCode}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge>{athlete.status}</Badge>
                    {snapshot.summary?.level && (
                      <Badge>{snapshot.summary.level}</Badge>
                    )}
                  </div>
                  {athlete.bio && (
                    <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400">
                      {athlete.bio}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-4 border-t pt-4 text-sm text-zinc-500">
                {(athlete.city || athlete.state) && (
                  <span className="flex items-center gap-2">
                    <MapPin size={15} aria-hidden="true" />
                    {[athlete.city, athlete.state].filter(Boolean).join(" / ")}
                  </span>
                )}
                {athlete.instagramHandle && (
                  <span>@{athlete.instagramHandle}</span>
                )}
              </div>
            </Card>

            <Card>
              <p className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
                Vínculo esportivo
              </p>
              <div className="mt-4 grid gap-3">
                {snapshot.teams && snapshot.teams.length > 0 ? (
                  snapshot.teams.map((team) => (
                    <div
                      key={team.id}
                      className="rounded-ur flex items-center gap-3 border p-3"
                    >
                      <Shield
                        className="text-ur-gold"
                        size={18}
                        aria-hidden="true"
                      />
                      <div>
                        <p className="font-bold">{team.name}</p>
                        <p className="text-xs text-zinc-500">Equipe Oficial</p>
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

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <p className="flex items-center gap-2 font-bold">
                <CreditCard
                  className="text-ur-gold"
                  size={17}
                  aria-hidden="true"
                />{" "}
                Pacotes ativos
              </p>
              <div className="mt-4 grid gap-3">
                {snapshot.packages && snapshot.packages.length > 0 ? (
                  snapshot.packages.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0"
                    >
                      <div>
                        <p className="text-sm font-bold">{item.name}</p>
                        <p className="text-xs text-zinc-600">{item.code}</p>
                      </div>
                      <p className="font-display text-xl font-black">
                        {item.unitsRemaining === null ? "—" : item.unitsRemaining}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-zinc-500">Nenhum pacote ativo.</p>
                )}
              </div>
            </Card>
            <Card>
              <p className="flex items-center gap-2 font-bold">
                <Coins className="text-ur-gold" size={17} aria-hidden="true" />{" "}
                Economia UR
              </p>
              <div className="mt-5 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-zinc-500 uppercase">UR Coins</p>
                  <p className="font-display mt-1 text-3xl font-black">
                    {snapshot.summary?.urCoinBalance ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase">Créditos</p>
                  <p className="font-display mt-1 text-3xl font-black">
                    {snapshot.creditBalance ?? "—"}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}

      <AthleteSourceHealth errors={snapshot.sourceErrors} />
    </div>
  );
}
