import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AthleteAvatar } from "@/components/athlete/athlete-avatar";
import { BrandMark } from "@/components/layout/brand-mark";
import { Card, PageHeader } from "@/components/ui";
import { EngagementViewEvent } from "@/features/engagement/engagement-client";
import { createClient } from "@/lib/supabase/server";
import { getPublicAthlete } from "@/server/repositories/rankings.repository";
import { levelLabel } from "@/server/services/ranking-classification.service";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PublicAthletePage({
  params,
}: {
  params: Promise<{ athleteCode: string }>;
}) {
  const { athleteCode } = await params;
  const data = await getPublicAthlete(await createClient(), athleteCode);
  if (!data) notFound();
  const r = data.ranking;
  return (
    <main className="mx-auto min-h-dvh max-w-4xl px-5 py-6 sm:px-8">
      <EngagementViewEvent
        eventName="athlete_profile_viewed"
        athleteId={data.profile.athlete_id}
        objectType="athlete"
        objectId={data.profile.athlete_id}
        metadata={{
          route: `/athletes/${athleteCode}`,
          source: "public_ranking_profile",
        }}
        dedupKey={`public-athlete:${data.profile.athlete_id}`}
      />
      <header className="mb-12 flex items-center justify-between">
        <BrandMark />
        <Link href="/rankings/individual" className="font-bold">
          Ranking
        </Link>
      </header>
      <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
        <AthleteAvatar
          publicName={data.profile.public_name}
          imageUrl={data.profile.avatar_url}
          size="xl"
          priority
        />
        <PageHeader
          eyebrow={data.profile.athlete_code}
          title={data.profile.public_name}
          description={
            r
              ? [levelLabel(r.level), r.team_name, r.pole_name]
                  .filter(Boolean)
                  .join(" · ")
              : "Perfil esportivo público"
          }
        />
      </div>
      {r && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Card className="ranking-hero border-ur-gold/50">
            <p className="text-zinc-500">Posição no nível</p>
            <strong className="font-display text-8xl">
              #{r.current_position ?? "—"}
            </strong>
            <p className="text-ur-gold text-2xl font-black">
              {r.total_points} PTS
            </p>
          </Card>
          <Card>
            <h2 className="font-black">ESTATÍSTICAS ESPORTIVAS</h2>
            <dl className="mt-5 grid grid-cols-2 gap-4">
              <div>
                <dt>Jogos</dt>
                <dd className="text-2xl font-bold">{r.games_played}</dd>
              </div>
              <div>
                <dt>Vitórias</dt>
                <dd className="text-2xl font-bold">{r.wins}</dd>
              </div>
              <div>
                <dt>Aces</dt>
                <dd className="text-2xl font-bold">{r.aces}</dd>
              </div>
              <div>
                <dt>Ataques</dt>
                <dd className="text-2xl font-bold">{r.attacks}</dd>
              </div>
            </dl>
          </Card>
        </div>
      )}
      <p className="mt-8 text-xs text-zinc-600">
        Perfil não indexável por padrão. E-mail, telefone, nascimento, notas e
        dados administrativos nunca são exibidos.
      </p>
    </main>
  );
}
